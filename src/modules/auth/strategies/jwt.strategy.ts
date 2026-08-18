import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { TpiStaffRelationship } from '../../users/entities/tpi-staff-relationship.entity';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        return jwtSecret;
      })(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Deny deactivated users (DO, CO, TPI, TPI_STAFF, EM)
    if (user.role !== UserRole.HO) {
      if (!user.is_active) {
        throw new UnauthorizedException('Your account is deactivated');
      }
    }

    // Deny TPI staff if parent TPI is deactivated
    if (user.role === UserRole.TPI_STAFF) {
      const relationship = await this.dataSource
        .getRepository(TpiStaffRelationship)
        .findOne({
          where: { staff_id: user.id },
          relations: ['tpi'],
        });

      if (!relationship || !relationship.tpi || !relationship.tpi.is_active) {
        throw new UnauthorizedException(
          'Parent TPI agency is inactive or relationship is missing',
        );
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      is_executive_engineer: user.is_executive_engineer,
      district_id: user.district_id,
    };
  }
}
