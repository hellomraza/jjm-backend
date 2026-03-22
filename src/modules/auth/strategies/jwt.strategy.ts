import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.service';

/**
 * Custom JWT extraction function that supports BOTH:
 * 1. HTTP-only cookies (for Next.js web app)
 * 2. Authorization Bearer header (for React Native mobile app)
 *
 * Priority:
 * - First checks cookies (req.cookies.access_token)
 * - Falls back to Authorization header (Bearer token)
 */
const extractJwt = (req: Request): string | null => {
  // 1. Try cookie first (for web)
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  // 2. Fall back to Authorization header (for mobile)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: extractJwt,
      ignoreExpiration: false,
      secretOrKey: (() => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        return jwtSecret;
      })(),
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
