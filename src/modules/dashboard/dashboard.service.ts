import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { District } from '../locations/entities/district.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import {
  DashboardStatsDto,
  DistrictDashboardDto,
  UserStatsDto,
  WorkItemStatsDto,
  WorkItemWithProgressDto,
} from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepository: Repository<WorkItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
  ) {}

  async getStats(
    userId: string,
    userRole: UserRole,
  ): Promise<DashboardStatsDto | DistrictDashboardDto> {
    if (userRole === UserRole.HO) {
      return this.getHOStats();
    }

    if (userRole === UserRole.DO) {
      return this.getDOStats(userId);
    }

    throw new NotFoundException('Invalid user role for dashboard access');
  }

  private async getHOStats(): Promise<DashboardStatsDto> {
    const [workItemStats, userStats, totalAgreements] = await Promise.all([
      this.getWorkItemStats(),
      this.getUserStats(),
      this.agreementRepository.count(),
    ]);

    return {
      workItems: workItemStats,
      users: userStats,
      totalAgreements,
      generatedAt: new Date(),
    };
  }

  private async getDOStats(userId: string): Promise<DistrictDashboardDto> {
    // Get the DO user to get their district_id
    const doUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!doUser || !doUser.district_id) {
      throw new NotFoundException(
        'District Officer must have a district assigned',
      );
    }

    const districtId = doUser.district_id;

    // Get the district name
    const district = await this.districtRepository.findOne({
      where: { districtid: districtId },
    });
    const districtName = district?.districtname || 'Unknown District';

    // Get work items for the district
    const [workItemStats, workItemsList] = await Promise.all([
      this.getDistrictWorkItemStats(districtId),
      this.getDistrictWorkItems(districtId),
    ]);

    return {
      districtName,
      workItems: workItemStats,
      workItemsList,
      generatedAt: new Date(),
    };
  }

  private async getDistrictWorkItemStats(
    districtId: number,
  ): Promise<WorkItemStatsDto> {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.workItemRepository.count({
        where: { district_id: districtId },
      }),
      this.workItemRepository.count({
        where: { district_id: districtId, status: WorkItemStatus.PENDING },
      }),
      this.workItemRepository.count({
        where: { district_id: districtId, status: WorkItemStatus.IN_PROGRESS },
      }),
      this.workItemRepository.count({
        where: { district_id: districtId, status: WorkItemStatus.COMPLETED },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }

  private async getDistrictWorkItems(
    districtId: number,
  ): Promise<WorkItemWithProgressDto[]> {
    const workItems = await this.workItemRepository.find({
      where: { district_id: districtId },
      order: { created_at: 'DESC' },
    });

    return workItems.map((item) => ({
      id: item.id,
      work_code: item.work_code,
      title: item.title,
      status: item.status,
      progress_percentage: item.progress_percentage || 0,
      description: item.description,
    }));
  }

  private async getWorkItemStats(): Promise<WorkItemStatsDto> {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.workItemRepository.count(),
      this.workItemRepository.count({
        where: { status: WorkItemStatus.PENDING },
      }),
      this.workItemRepository.count({
        where: { status: WorkItemStatus.IN_PROGRESS },
      }),
      this.workItemRepository.count({
        where: { status: WorkItemStatus.COMPLETED },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }

  private async getUserStats(): Promise<UserStatsDto> {
    const [employees, contractors, districtOfficers, headOffice, total] =
      await Promise.all([
        this.userRepository.count({ where: { role: UserRole.EM } }),
        this.userRepository.count({ where: { role: UserRole.CO } }),
        this.userRepository.count({ where: { role: UserRole.DO } }),
        this.userRepository.count({ where: { role: UserRole.HO } }),
        this.userRepository.count(),
      ]);

    return {
      employees,
      contractors,
      districtOfficers,
      headOffice,
      total,
    };
  }
}
