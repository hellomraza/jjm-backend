import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class ExecutiveEngineerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole; is_executive_engineer?: boolean } | undefined;

    if (!user) {
      throw new ForbiddenException('User authentication is missing');
    }

    if (user.role !== UserRole.DO || !user.is_executive_engineer) {
      throw new ForbiddenException('Only Executive Engineers can access this resource');
    }

    return true;
  }
}
