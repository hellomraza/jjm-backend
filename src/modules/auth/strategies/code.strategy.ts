import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class CodeStrategy extends PassportStrategy(Strategy, 'code') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'code',
      passwordField: 'password',
    });
  }

  async validate(code: string, password: string): Promise<any> {
    const user = await this.authService.validateUserByCode(code, password);
    if (!user) {
      throw new UnauthorizedException('Invalid code or password');
    }
    return user;
  }
}
