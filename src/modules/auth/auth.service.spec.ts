import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MailService } from '../../common/mail/mail.service';
import { Repository } from 'typeorm';
import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    comparePasswords: jest.fn(),
    resetPassword: jest.fn(),
    findByCode: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  } as unknown as JwtService;

  const mailService = {
    sendMail: jest.fn(),
  } as unknown as MailService;

  const otpRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<PasswordResetOtp>;

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
      mailService,
      otpRepository,
    );
    jest.clearAllMocks();
  });

  it('validateUser returns user without password when credentials are valid', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'u@jjm.local',
      password: 'hashed',
      role: UserRole.HO,
    });
    usersService.comparePasswords.mockResolvedValue(true);

    const result = await service.validateUser('u@jjm.local', 'Plain@123');

    expect(result).toEqual({
      id: 'u1',
      email: 'u@jjm.local',
      role: UserRole.HO,
    });
  });

  it('login throws for invalid user', () => {
    expect(() => service.login(null as unknown as never)).toThrow(
      UnauthorizedException,
    );
  });

  describe('forgotPassword', () => {
    it('always returns a success message even if email is not registered', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');
      expect(result).toEqual({
        message: 'If an account exists, an OTP has been sent.',
      });
      expect(otpRepository.create).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('generates, hashes, stores, and sends OTP if email is registered', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
      });
      (otpRepository.create as jest.Mock).mockReturnValue({ email: 'user@example.com' });
      (otpRepository.save as jest.Mock).mockResolvedValue({ id: 'otp1' });
      (mailService.sendMail as jest.Mock).mockResolvedValue({ messageId: 'msg1' });

      const result = await service.forgotPassword('user@example.com');
      expect(result).toEqual({
        message: 'If an account exists, an OTP has been sent.',
      });
      expect(otpRepository.create).toHaveBeenCalled();
      expect(otpRepository.save).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException if user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'user@example.com',
          otp: '123456',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if no active OTP record is found', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
      (otpRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'user@example.com',
          otp: '123456',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if OTP record is expired', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
      (otpRepository.findOne as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        otp_hash: 'hashed',
        expires_at: new Date(Date.now() - 5000), // 5 seconds ago
        attempts: 0,
        used: false,
      });

      await expect(
        service.resetPassword({
          email: 'user@example.com',
          otp: '123456',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if OTP record has too many attempts', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
      (otpRepository.findOne as jest.Mock).mockResolvedValue({
        email: 'user@example.com',
        otp_hash: 'hashed',
        expires_at: new Date(Date.now() + 60000), // 1 minute in future
        attempts: 5,
        used: false,
      });

      await expect(
        service.resetPassword({
          email: 'user@example.com',
          otp: '123456',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts if OTP is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
      const record = {
        email: 'user@example.com',
        otp_hash: await bcrypt.hash('111111', 10),
        expires_at: new Date(Date.now() + 60000),
        attempts: 0,
        used: false,
      };
      (otpRepository.findOne as jest.Mock).mockResolvedValue(record);

      await expect(
        service.resetPassword({
          email: 'user@example.com',
          otp: '222222', // incorrect OTP
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(record.attempts).toBe(1);
      expect(otpRepository.save).toHaveBeenCalledWith(record);
    });

    it('resets user password and marks OTP as used if verification succeeds', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
      const record = {
        email: 'user@example.com',
        otp_hash: await bcrypt.hash('123456', 10),
        expires_at: new Date(Date.now() + 60000),
        attempts: 0,
        used: false,
      };
      (otpRepository.findOne as jest.Mock).mockResolvedValue(record);

      const result = await service.resetPassword({
        email: 'user@example.com',
        otp: '123456',
        newPassword: 'Password@123',
      });

      expect(result).toEqual({
        message: 'Password has been reset successfully.',
      });
      expect(record.used).toBe(true);
      expect(otpRepository.save).toHaveBeenCalledWith(record);
      expect(usersService.resetPassword).toHaveBeenCalledWith('user@example.com', 'Password@123');
    });
  });

  describe('forgotPasswordByCode', () => {
    it('always returns a success message even if code is not registered', async () => {
      usersService.findByCode.mockResolvedValue(null);

      const result = await service.forgotPasswordByCode('CO_UNKNOWN');
      expect(result).toEqual({
        message: 'If an account exists, an OTP has been sent.',
      });
      expect(otpRepository.create).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('delegates to forgotPassword with email if code is registered', async () => {
      usersService.findByCode.mockResolvedValue({
        id: 'u1',
        email: 'co@example.com',
      });
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'co@example.com',
      });
      (otpRepository.create as jest.Mock).mockReturnValue({ email: 'co@example.com' });
      (otpRepository.save as jest.Mock).mockResolvedValue({ id: 'otp1' });
      (mailService.sendMail as jest.Mock).mockResolvedValue({ messageId: 'msg1' });

      const result = await service.forgotPasswordByCode('CO_123');
      expect(result).toEqual({
        message: 'If an account exists, an OTP has been sent.',
      });
      expect(usersService.findByCode).toHaveBeenCalledWith('CO_123');
      expect(otpRepository.create).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('resetPasswordByCode', () => {
    it('throws BadRequestException if user does not exist', async () => {
      usersService.findByCode.mockResolvedValue(null);

      await expect(
        service.resetPasswordByCode({
          code: 'CO_UNKNOWN',
          otp: '123456',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates to resetPassword if user exists', async () => {
      usersService.findByCode.mockResolvedValue({ id: 'u1', email: 'co@example.com' });
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'co@example.com' });
      const record = {
        email: 'co@example.com',
        otp_hash: await bcrypt.hash('123456', 10),
        expires_at: new Date(Date.now() + 60000),
        attempts: 0,
        used: false,
      };
      (otpRepository.findOne as jest.Mock).mockResolvedValue(record);

      const result = await service.resetPasswordByCode({
        code: 'CO_123',
        otp: '123456',
        newPassword: 'Password@123',
      });

      expect(result).toEqual({
        message: 'Password has been reset successfully.',
      });
      expect(record.used).toBe(true);
      expect(otpRepository.save).toHaveBeenCalledWith(record);
      expect(usersService.resetPassword).toHaveBeenCalledWith('co@example.com', 'Password@123');
    });
  });
});

