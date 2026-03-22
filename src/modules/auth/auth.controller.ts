import { Controller, Post, Req, Res, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * HYBRID LOGIN ENDPOINT:
   * - Returns token in response body (for mobile app compatibility)
   * - Sets token in HTTP-only cookie (for web app security)
   *
   * Clients:
   * - Mobile (React Native): Extract access_token from response body, use in Authorization header
   * - Web (Next.js): Cookie auto-sent with requests, no additional code needed
   *
   * Rate Limiting: 5 attempts per minute (brute-force protection)
   */
  @Post('login')
  @Throttle({ short: { limit: 5 } }) // 5 requests per minute per IP
  @UseGuards(AuthGuard('local'))
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate using email/password and return JWT access token + HTTP-only cookie',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts, try again later' })
  login(
    @Req() req: Request & { user: Omit<User, 'password'> },
    @Res() res: Response,
  ) {
    const user = req.user;
    const loginResponse = this.authService.login(user);

    // Set HTTP-only cookie for web apps
    res.cookie('access_token', loginResponse.access_token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours (match JWT expiration)
    });

    // Return token in response body for mobile apps + user info
    res.json(loginResponse);
  }

  /**
   * LOGOUT ENDPOINT:
   * - Clears HTTP-only cookie
   * - Invalidates session for web apps
   * - No effect on mobile (tokens remain valid until expiration)
   *
   * Mobile apps should separately manage token deletion on their side
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'User logout',
    description: 'Clear authentication cookie and end session (web)',
  })
  @ApiOkResponse({ description: 'Logout successful' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  logout(@Res() res: Response) {
    // Clear HTTP-only cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out successfully' });
  }
}
