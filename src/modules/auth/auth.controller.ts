import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginCodeDto } from './dto/login-code.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordCodeDto } from './dto/forgot-password-code.dto';
import { ResetPasswordCodeDto } from './dto/reset-password-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate using email/password and return JWT access token',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Req() req: Request & { user: Omit<User, 'password'> }) {
    const user = req.user;
    return this.authService.login(user);
  }

  @Post('dashboard/login')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({
    summary: 'Dashboard login',
    description:
      'Authenticate using email/password for dashboard access. Only HO, CO, and DO roles are allowed.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Dashboard login successful',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({
    description: 'Your role does not have access to the dashboard',
  })
  dashboardLogin(@Req() req: Request & { user: Omit<User, 'password'> }) {
    const user = req.user;
    return this.authService.dashboardLogin(user);
  }

  @Post('login/code')
  @UseGuards(AuthGuard('code'))
  @ApiOperation({
    summary: 'User login with code',
    description:
      'Authenticate using user code and password. All user roles (HO, CO, DO, EM) can login with this endpoint.',
  })
  @ApiBody({ type: LoginCodeDto })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid code or password' })
  loginWithCode(@Req() req: Request & { user: Omit<User, 'password'> }) {
    const user = req.user;
    return this.authService.login(user);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset OTP',
    description:
      'Generates a 6-digit OTP, hashes it, and stores it in the database before sending it via email if the account exists.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'If an account exists, an OTP has been sent.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with OTP',
    description: 'Verify the OTP and set a new password for the user.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password has been reset successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid email/OTP or expired OTP' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('forgot-password/code')
  @ApiOperation({
    summary: 'Request password reset OTP by user code',
    description:
      'Generates a 6-digit OTP, hashes it, and stores it in the database before sending it via email using the user code to find the associated account email.',
  })
  @ApiBody({ type: ForgotPasswordCodeDto })
  @ApiOkResponse({ description: 'If an account exists, an OTP has been sent.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  forgotPasswordByCode(@Body() forgotPasswordCodeDto: ForgotPasswordCodeDto) {
    return this.authService.forgotPasswordByCode(forgotPasswordCodeDto.code);
  }

  @Post('reset-password/code')
  @ApiOperation({
    summary: 'Reset password with OTP using user code',
    description: 'Verify the OTP and set a new password for the user matching the given user code.',
  })
  @ApiBody({ type: ResetPasswordCodeDto })
  @ApiOkResponse({ description: 'Password has been reset successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid code/OTP or expired OTP' })
  resetPasswordByCode(@Body() resetPasswordCodeDto: ResetPasswordCodeDto) {
    return this.authService.resetPasswordByCode(resetPasswordCodeDto);
  }
}
