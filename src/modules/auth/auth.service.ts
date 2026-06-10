import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../common/mail/mail.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordCodeDto } from './dto/reset-password-code.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(PasswordResetOtp)
    private readonly otpRepository: Repository<PasswordResetOtp>,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async validateUserByCode(
    code: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByCode(code);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  login(user: Omit<User, 'password'>) {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  dashboardLogin(user: Omit<User, 'password'>) {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only allow HO, CO, and DO roles for dashboard login
    const allowedRoles = [UserRole.HO, UserRole.CO, UserRole.DO];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Your role does not have access to the dashboard',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.log(`Forgot password requested for non-existent email: ${email}`);
      return { message: 'If an account exists, an OTP has been sent.' };
    }
    if (user.role !== UserRole.CO) {
      throw new BadRequestException('Only Contractor (CO) accounts are allowed to reset their password.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const otpHash = await bcrypt.hash(otp, 10);

    // Set expiry to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store in database
    const otpRecord = this.otpRepository.create({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      used: false,
      attempts: 0,
    });
    await this.otpRepository.save(otpRecord);

    // Send OTP via Email
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Password Reset OTP',
        html: `<p>Your 6-digit OTP for resetting your password is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`,
        text: `Your 6-digit OTP for resetting your password is: ${otp}. This OTP will expire in 10 minutes.`,
      });
      this.logger.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error instanceof Error ? error.stack : error);
    }

    return { message: 'If an account exists, an OTP has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = resetPasswordDto;

    // Check if the user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }
    if (user.role !== UserRole.CO) {
      throw new BadRequestException('Only Contractor (CO) accounts are allowed to reset their password.');
    }

    // Retrieve active unused OTP records for email
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email,
        used: false,
      },
      order: {
        created_at: 'DESC',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid email or OTP');
    }

    // Check expiration
    if (otpRecord.expires_at < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Check attempts limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    // Verify the OTP
    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isOtpValid) {
      otpRecord.attempts += 1;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('Invalid OTP');
    }

    // OTP is valid. Mark it as used.
    otpRecord.used = true;
    await this.otpRepository.save(otpRecord);

    // Reset user password in UsersService
    await this.usersService.resetPassword(email, newPassword);

    this.logger.log(`Password reset successfully for user: ${email}`);
    return { message: 'Password has been reset successfully.' };
  }

  async forgotPasswordByCode(code: string): Promise<{ message: string }> {
    const user = await this.usersService.findByCode(code);
    if (!user) {
      this.logger.log(`Forgot password requested for non-existent code: ${code}`);
      return { message: 'If an account exists, an OTP has been sent.' };
    }
    if (!user.email) {
      this.logger.log(`Forgot password requested for user without email: ${code}`);
      return { message: 'If an account exists, an OTP has been sent.' };
    }
    if (user.role !== UserRole.CO) {
      throw new BadRequestException('Only Contractor (CO) accounts are allowed to reset their password.');
    }
    return this.forgotPassword(user.email);
  }

  async resetPasswordByCode(resetPasswordCodeDto: ResetPasswordCodeDto): Promise<{ message: string }> {
    const { code, otp, newPassword } = resetPasswordCodeDto;
    const user = await this.usersService.findByCode(code);
    if (!user || !user.email) {
      throw new BadRequestException('Invalid code or OTP');
    }
    if (user.role !== UserRole.CO) {
      throw new BadRequestException('Only Contractor (CO) accounts are allowed to reset their password.');
    }
    return this.resetPassword({
      email: user.email,
      otp,
      newPassword,
    });
  }
}
