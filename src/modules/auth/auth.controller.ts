import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Req() req: Request & { user: Omit<User, 'password'> }) {
    const user = req.user;
    return this.authService.login(user);
  }
}
