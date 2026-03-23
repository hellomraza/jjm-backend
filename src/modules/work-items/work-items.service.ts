import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { AgreementsService } from '../agreements/agreements.service';
import { Component } from '../components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { WorkItemEmployeeAssignment } from './entities/work-item-employee-assignment.entity';
import { WorkItem, WorkItemStatus } from './entities/work-item.entity';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
    @InjectRepository(WorkItemEmployeeAssignment)
    private readonly workItemEmployeeAssignmentsRepository: Repository<WorkItemEmployeeAssignment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly agreementsService: AgreementsService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly locationRelations = {
    contractor: true,
    district: true,
    block: true,
    panchayat: true,
    village: true,
    subdivision: true,
    circle: true,
    zone: true,
  } as const;

  private buildNumericCodeBody(): string {
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${Date.now()}${randomSuffix}`.slice(-12);
  }

  private async generateUniqueWorkCode(
    manager: EntityManager,
  ): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `W${this.buildNumericCodeBody()}`;
      const exists = await manager.exists(WorkItem, {
        where: { work_code: candidate },
      });

      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate unique work code',
    );
  }

  async create(createWorkItemDto: CreateWorkItemDto): Promise<WorkItem> {
    return this.dataSource.transaction(async (manager) => {
      const masterComponents = await manager.find(Component, {
        order: { order_number: 'ASC' },
      });

      if (masterComponents.length !== 12) {
        throw new NotFoundException(
          `Expected 12 static components, found ${masterComponents.length}`,
        );
      }

      const workCode = await this.generateUniqueWorkCode(manager);

      const workItem = manager.create(WorkItem, {
        ...createWorkItemDto,
        work_code: workCode,
        progress_percentage: createWorkItemDto.progress_percentage ?? 0,
        status: createWorkItemDto.status ?? WorkItemStatus.PENDING,
      });

      const savedWorkItem = await manager.save(WorkItem, workItem);

      const agreementCreator: Pick<AgreementsService, 'createWithManager'> =
        this.agreementsService;

      await agreementCreator.createWithManager(manager, {
        contractor_id: savedWorkItem.contractor_id,
        work_id: savedWorkItem.id,
      });

      const mappings = masterComponents.map((component) => {
        const mapping = new WorkItemComponent();
        mapping.work_item_id = savedWorkItem.id;
        mapping.component_id = component.id;
        mapping.quantity = undefined;
        mapping.remarks = undefined;
        mapping.status = WorkItemComponentStatus.PENDING;
        return mapping;
      });

      await manager.save(WorkItemComponent, mappings);
      return savedWorkItem;
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: WorkItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    const [items, total] = await this.workItemsRepository.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: this.locationRelations,
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getMyWorkItems(
    userId: string,
    role: UserRole,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: WorkItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    let where: FindOptionsWhere<WorkItem> = {};

    if (role === UserRole.CO) {
      where = { contractor_id: userId };
    }

    if (role === UserRole.DO) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.district_id) {
        throw new InternalServerErrorException(
          `User with role ${role} does not have district assignment`,
        );
      }

      const districtId = Number(user.district_id);
      if (!Number.isInteger(districtId)) {
        throw new InternalServerErrorException(
          `User with role ${role} has invalid district assignment`,
        );
      }

      where = { district_id: districtId };
    }

    if (role === UserRole.EM) {
      const assignedRows =
        await this.workItemEmployeeAssignmentsRepository.find({
          where: { employee_id: userId },
          select: ['work_item_id'],
        });

      const assignedWorkItemIds = [
        ...new Set(assignedRows.map((row) => row.work_item_id)),
      ];

      if (assignedWorkItemIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        };
      }

      where = { id: In(assignedWorkItemIds) };
    }

    const [items, total] = await this.workItemsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: this.locationRelations,
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(id: string): Promise<WorkItem> {
    const workItem = await this.workItemsRepository.findOne({
      where: { id },
      relations: this.locationRelations,
    });
    if (!workItem) {
      throw new NotFoundException(`Work item #${id} not found`);
    }

    return workItem;
  }

  async getDistrictOfficerByWorkItem(
    workItemId: string,
  ): Promise<Omit<User, 'password'>> {
    const workItem = await this.workItemsRepository.findOne({
      where: { id: workItemId },
    });

    if (!workItem) {
      throw new NotFoundException(`Work item #${workItemId} not found`);
    }

    const districtId = workItem.district_id;

    const districtOfficer = await this.usersRepository.findOne({
      where: { district_id: districtId, role: UserRole.DO },
    });

    if (!districtOfficer) {
      throw new NotFoundException(
        `District Officer not found for district ${districtId}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = districtOfficer;
    return userWithoutPassword;
  }

  async assignEmployeeToWorkItem(
    contractorId: string,
    workItemId: string,
    employeeId: string,
  ): Promise<WorkItemEmployeeAssignment> {
    const workItem = await this.workItemsRepository.findOne({
      where: { id: workItemId },
    });

    if (!workItem) {
      throw new NotFoundException(`Work item #${workItemId} not found`);
    }

    if (workItem.contractor_id !== contractorId) {
      throw new ForbiddenException(
        'You can only assign employees to your own work items',
      );
    }

    const employee = await this.usersRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || employee.role !== UserRole.EM) {
      throw new UnprocessableEntityException(
        `Employee user #${employeeId} not found`,
      );
    }

    const existingAssignment =
      await this.workItemEmployeeAssignmentsRepository.findOne({
        where: { work_item_id: workItemId, employee_id: employeeId },
      });

    if (existingAssignment) {
      return existingAssignment;
    }

    const assignment = this.workItemEmployeeAssignmentsRepository.create({
      work_item_id: workItemId,
      employee_id: employeeId,
    });

    return this.workItemEmployeeAssignmentsRepository.save(assignment);
  }

  async update(
    id: string,
    updateWorkItemDto: UpdateWorkItemDto,
  ): Promise<WorkItem> {
    const workItem = await this.findOne(id);
    Object.assign(workItem, updateWorkItemDto);
    return this.workItemsRepository.save(workItem);
  }

  async updateStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
    const workItem = await this.findOne(id);
    workItem.status = status;

    if (status === WorkItemStatus.COMPLETED) {
      workItem.progress_percentage = 100;
    }

    if (status === WorkItemStatus.PENDING && workItem.progress_percentage > 0) {
      workItem.progress_percentage = 0;
    }

    return this.workItemsRepository.save(workItem);
  }

  async remove(id: string): Promise<void> {
    const workItem = await this.findOne(id);
    await this.workItemsRepository.remove(workItem);
  }
}
