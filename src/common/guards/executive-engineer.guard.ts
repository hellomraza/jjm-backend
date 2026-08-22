import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class ExecutiveEngineerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole; is_bulk_order_allowed?: boolean } | undefined;

    if (!user) {
      throw new ForbiddenException('User authentication is missing');
    }

    if (user.role !== UserRole.DO || !user.is_bulk_order_allowed) {
      throw new ForbiddenException('Only District Officers with bulk order permissions can access this resource');
    }

    return true;
  }
}
