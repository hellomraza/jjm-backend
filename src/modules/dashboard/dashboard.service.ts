import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { District } from '../locations/entities/district.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import {
  DashboardStatsDto,
  DistrictDashboardDto,
  ContractorDashboardDto,
  UserStatsDto,
  WorkItemStatsDto,
  WorkItemWithProgressDto,
  ComponentStatusCountDto,
  ContractorWorkItemDto,
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
    @InjectRepository(WorkItemComponent)
    private readonly workItemComponentRepository: Repository<WorkItemComponent>,
    @InjectRepository(WorkItemEmployeeAssignment)
    private readonly workItemEmployeeAssignmentRepository: Repository<WorkItemEmployeeAssignment>,
  ) {}

  async getStats(
    userId: string,
    userRole: UserRole,
  ): Promise<DashboardStatsDto | DistrictDashboardDto | ContractorDashboardDto> {
    if (userRole === UserRole.HO) {
      return this.getHOStats();
    }

    if (userRole === UserRole.DO) {
      return this.getDOStats(userId);
    }

    if (userRole === UserRole.CO) {
      return this.getCOStats(userId);
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

  private async getCOStats(
    contractorId: string,
  ): Promise<ContractorDashboardDto> {
    // Get all work items for the contractor
    const workItems = await this.workItemRepository.find({
      where: { contractor_id: contractorId },
      order: { created_at: 'DESC' },
    });

    // Get detailed info for each work item
    const workItemsDetails = await Promise.all(
      workItems.map((item) => this.getContractorWorkItemDetails(item.id)),
    );

    return {
      totalWorkItems: workItems.length,
      workItems: workItemsDetails,
      generatedAt: new Date(),
    };
  }

  private async getContractorWorkItemDetails(
    workItemId: string,
  ): Promise<ContractorWorkItemDto> {
    const workItem = await this.workItemRepository.findOne({
      where: { id: workItemId },
    });

    if (!workItem) {
      throw new NotFoundException(`Work item ${workItemId} not found`);
    }

    const [componentStats, assignedEmployees] = await Promise.all([
      this.getComponentStatusCount(workItemId),
      this.getAssignedEmployeeCount(workItemId),
    ]);

    return {
      id: workItem.id,
      work_code: workItem.work_code,
      title: workItem.title,
      status: workItem.status,
      componentStats,
      assignedEmployees,
    };
  }

  private async getComponentStatusCount(
    workItemId: string,
  ): Promise<ComponentStatusCountDto> {
    const [pending, submitted, inProgress, approved, rejected] =
      await Promise.all([
        this.workItemComponentRepository.count({
          where: {
            work_item_id: workItemId,
            status: WorkItemComponentStatus.PENDING,
          },
        }),
        this.workItemComponentRepository.count({
          where: {
            work_item_id: workItemId,
            status: WorkItemComponentStatus.SUBMITTED,
          },
        }),
        this.workItemComponentRepository.count({
          where: {
            work_item_id: workItemId,
            status: WorkItemComponentStatus.IN_PROGRESS,
          },
        }),
        this.workItemComponentRepository.count({
          where: {
            work_item_id: workItemId,
            status: WorkItemComponentStatus.APPROVED,
          },
        }),
        this.workItemComponentRepository.count({
          where: {
            work_item_id: workItemId,
            status: WorkItemComponentStatus.REJECTED,
          },
        }),
      ]);

    return {
      pending,
      submitted,
      inProgress,
      approved,
      rejected,
    };
  }

  private async getAssignedEmployeeCount(
    workItemId: string,
  ): Promise<number> {
    return this.workItemEmployeeAssignmentRepository.count({
      where: { work_item_id: workItemId },
    });
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
