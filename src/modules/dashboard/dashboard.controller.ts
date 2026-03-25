import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';
import {
  DashboardStatsDto,
  DistrictDashboardDto,
} from './dto/dashboard-stats.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns statistics based on user role. HO users get comprehensive application statistics. DO users get district-specific statistics with work items and progress percentages.',
  })
  @ApiExtraModels(DistrictDashboardDto, DashboardStatsDto)
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/DashboardStatsDto' },
        { $ref: '#/components/schemas/DistrictDashboardDto' },
      ],
    },
  })
  getStats(
    @Request() req: { user: { userId: string; role: UserRole } },
  ): Promise<DashboardStatsDto | DistrictDashboardDto> {
    return this.dashboardService.getStats(req.user.userId, req.user.role);
  }
}
