import { Controller, Post, Req, UseGuards } from '@nestjs/common';
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
import { LoginCodeDto } from './dto/login-code.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';

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
}
