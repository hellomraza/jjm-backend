import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  DashboardStatsDto,
  WorkItemStatsDto,
  UserStatsDto,
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
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
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
