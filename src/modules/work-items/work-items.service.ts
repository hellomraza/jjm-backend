import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { AgreementsService } from '../agreements/agreements.service';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Component } from '../components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import {
  importWorkItemMapping,
  type WorkItemImport,
} from '../import/import.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AssignMultipleEmployeesResponseDto } from './dto/assign-work-item-employee.dto';
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

  private isTemporaryContractor(contractor: User): boolean {
    return (
      contractor.role === UserRole.CO &&
      contractor.email.startsWith('temp-contractor-') &&
      contractor.email.endsWith('@import.local') &&
      contractor.name.startsWith('Temporary Contractor ')
    );
  }

  private async findOrCreateTemporaryContractor(
    manager: EntityManager,
    contractorCode: string,
  ): Promise<User> {
    const contractor = await manager.findOne(User, {
      where: { code: contractorCode, role: UserRole.CO },
    });

    if (contractor) {
      if (this.isTemporaryContractor(contractor)) {
        const codeHash = createHash('sha256')
          .update(contractorCode)
          .digest('hex')
          .slice(0, 16);

        Object.assign(contractor, {
          email: `temp-contractor-${codeHash}@import.local`,
          password: await bcrypt.hash(`temp-contractor-${codeHash}`, 10),
          name: `Temporary Contractor ${contractorCode}`,
          role: UserRole.CO,
        });

        return manager.save(User, contractor);
      }

      return contractor;
    }

    const existingUserWithCode = await manager.findOne(User, {
      where: { code: contractorCode },
    });

    if (existingUserWithCode) {
      throw new UnprocessableEntityException(
        `User code #${contractorCode} exists but is not a contractor`,
      );
    }

    const codeHash = createHash('sha256')
      .update(contractorCode)
      .digest('hex')
      .slice(0, 16);
    const password = await bcrypt.hash(`temp-contractor-${codeHash}`, 10);
    const temporaryContractor = manager.create(User, {
      code: contractorCode,
      email: `temp-contractor-${codeHash}@import.local`,
      password,
      name: `Temporary Contractor ${contractorCode}`,
      role: UserRole.CO,
    });

    return manager.save(User, temporaryContractor);
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

      let workItem = await manager.findOne(WorkItem, {
        where: { work_code: createWorkItemDto.work_code },
      });

      const isNew = !workItem;
      if (workItem && workItem.schemetype !== 'TEMP') {
        throw new ConflictException(
          `Work item with work code #${createWorkItemDto.work_code} already exists`,
        );
      }

      let contractorId: string | null = null;
      if (createWorkItemDto.agreement_id) {
        const agreement = await manager.findOne(Agreement, {
          where: { id: createWorkItemDto.agreement_id },
        });
        if (!agreement) {
          throw new NotFoundException(
            `Agreement #${createWorkItemDto.agreement_id} not found`,
          );
        }
        contractorId = agreement.contractor_id ?? null;
      }

      const { sr, agreement_id, title, latitude, longitude, ...rest } =
        createWorkItemDto;

      if (isNew) {
        workItem = manager.create(WorkItem, {
          ...rest,
          title: title || createWorkItemDto.work_code,
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          serial_no: sr ?? null,
          agreement_id: agreement_id ?? null,
          contractor_id: contractorId,
          progress_percentage: 0,
          status: WorkItemStatus.PENDING,
        } as any);
      } else {
        Object.assign(workItem!, {
          ...rest,
          title: title || createWorkItemDto.work_code,
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          serial_no: sr ?? null,
          agreement_id: agreement_id ?? null,
          contractor_id: contractorId,
          status: WorkItemStatus.PENDING,
        });
      }

      const savedWorkItem = await manager.save(WorkItem, workItem!);

      if (!isNew) {
        const existingComponents = await manager.find(WorkItemComponent, {
          where: { work_item_id: savedWorkItem.id },
        });
        await manager.remove(WorkItemComponent, existingComponents);
      }

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

  async bulkCreateFromImport(
    workItemImports: WorkItemImport[],
  ): Promise<WorkItem[]> {
    return this.dataSource.transaction(async (manager) => {
      const createdWorkItems: WorkItem[] = [];

      const masterComponents = await manager.find(Component, {
        order: { order_number: 'ASC' },
      });

      if (masterComponents.length !== 12) {
        throw new NotFoundException(
          `Expected 12 static components, found ${masterComponents.length}`,
        );
      }

      for (const workItemImport of workItemImports) {
        const contractorCode = workItemImport.contractor_code?.trim();
        let contractorId: string | null = null;

        if (contractorCode) {
          const contractor = await this.findOrCreateTemporaryContractor(
            manager,
            contractorCode,
          );

          contractorId = contractor.id;
        }

        const workCode = workItemImport.workcode?.trim();
        const schemetype = workItemImport.schemetype?.trim();

        if (!workCode) {
          throw new UnprocessableEntityException(
            'workcode is required for work item import',
          );
        }

        if (!schemetype) {
          throw new UnprocessableEntityException(
            'schemetype is required for work item import',
          );
        }

        const mappedWorkItem: Partial<WorkItem> = {};

        for (const [entityKey, importKey] of Object.entries(
          importWorkItemMapping,
        ) as Array<[keyof WorkItem, keyof WorkItemImport]>) {
          const rawValue = workItemImport[importKey];

          if (rawValue === null || rawValue === undefined) {
            continue;
          }

          switch (entityKey) {
            case 'district_id':
            case 'block_id':
            case 'panchayat_id':
            case 'workcodeid':
              mappedWorkItem[entityKey] = String(rawValue);
              break;
            case 'serial_no':
              mappedWorkItem[entityKey] =
                typeof rawValue === 'number' ? rawValue : Number(rawValue);
              break;
            case 'amount_approved':
            case 'payment_amount':
            case 'latitude':
            case 'longitude':
            case 'progress_percentage':
              mappedWorkItem[entityKey] =
                typeof rawValue === 'number' ? rawValue : Number(rawValue);
              break;
            case 'nofhtc':
              mappedWorkItem[entityKey] = String(rawValue);
              break;
            case 'created_at':
              mappedWorkItem[entityKey] =
                rawValue instanceof Date ? rawValue : new Date(rawValue);
              break;
            case 'work_code':
            case 'excel':
            case 'schemecategory':
            case 'schemetype':
              mappedWorkItem[entityKey] = String(rawValue);
              break;
          }
        }

        const workItem = manager.create(WorkItem, {
          ...mappedWorkItem,
          title: workCode,
          work_code: workCode,
          contractor_id: contractorId ?? undefined,
          latitude: Number.isFinite(Number(mappedWorkItem.latitude))
            ? Number(mappedWorkItem.latitude)
            : 0,
          longitude: Number.isFinite(Number(mappedWorkItem.longitude))
            ? Number(mappedWorkItem.longitude)
            : 0,
          progress_percentage: Number.isFinite(
            Number(mappedWorkItem.progress_percentage),
          )
            ? Number(mappedWorkItem.progress_percentage)
            : 0,
          status: WorkItemStatus.PENDING,
          district_id:
            mappedWorkItem.district_id === undefined ||
            mappedWorkItem.district_id === null
              ? null
              : mappedWorkItem.district_id,
        } as Partial<WorkItem>);

        const existingWorkItem = await manager.findOne(WorkItem, {
          where: { work_code: workCode },
        });

        if (existingWorkItem?.schemetype === 'TEMP') {
          const {
            work_code: _workCode,
            id,
            contractor_id,
            ...updatableWorkItemFields
          }: Partial<WorkItem> = {
            ...workItem,
          };

          Object.assign(existingWorkItem, {
            ...updatableWorkItemFields,
            description: updatableWorkItemFields?.description
              ?.toLocaleLowerCase()
              ?.includes('temporary')
              ? '---'
              : updatableWorkItemFields.description,
          });
          const savedWorkItem = await manager.save(WorkItem, existingWorkItem);

          const existingComponents = await manager.find(WorkItemComponent, {
            where: { work_item_id: existingWorkItem.id },
          });

          await manager.remove(WorkItemComponent, existingComponents);

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
          createdWorkItems.push(savedWorkItem);
          continue;
        }

        if (existingWorkItem) {
          throw new UnprocessableEntityException(
            `Work item with workcode #${workCode} already exists`,
          );
        }

        const savedWorkItem = await manager.save(WorkItem, workItem);

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
        createdWorkItems.push(savedWorkItem);
      }

      return createdWorkItems;
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<{
    data: WorkItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    const where: FindOptionsWhere<WorkItem> = {};
    if (search) {
      where.work_code = ILike(`%${search}%`);
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

  async getMyWorkItems(
    userId: string,
    role: UserRole,
    page: number = 1,
    limit: number = 20,
    search?: string,
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
      const agreementWorkItemIds =
        await this.agreementsService.getWorkItemIdsForContractor(userId);

      if (agreementWorkItemIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        };
      }

      where = {
        contractor_id: userId,
        id: In(agreementWorkItemIds),
      };
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

      const districtCode = String(user.district_id);
      if (!districtCode || districtCode.trim() === '') {
        throw new InternalServerErrorException(
          `User with role ${role} has invalid district assignment`,
        );
      }

      where = { district_id: districtCode };
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

    // Exclude temporary work items for all roles
    where.schemetype = Not('TEMP');

    if (search) {
      where.work_code = ILike(`%${search}%`);
    }

    const [items, total] = await this.workItemsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: this.locationRelations,
    });

    // Fetch components for each work item and calculate progress_percentage
    const itemsWithCalculatedProgress = await Promise.all(
      items.map(async (item) => {
        const components = await this.dataSource
          .getRepository(WorkItemComponent)
          .find({
            where: { work_item_id: item.id },
          });

        if (components.length > 0) {
          const approvedCount = components.filter(
            (comp) => comp.status === WorkItemComponentStatus.APPROVED,
          ).length;
          item.progress_percentage = Math.round(
            (approvedCount / components.length) * 100,
          );
        }

        return item;
      }),
    );

    return {
      data: itemsWithCalculatedProgress,
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

    const districtCode = workItem.district_id;

    if (districtCode == null) {
      throw new NotFoundException(
        `Work item #${workItemId} does not have a district assignment`,
      );
    }

    const districtOfficer = await this.usersRepository.findOne({
      where: { district_id: districtCode, role: UserRole.DO },
    });

    if (!districtOfficer) {
      throw new NotFoundException(
        `District Officer not found for district ${districtCode}`,
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

  async getAssignedEmployees(
    workItemId: string,
  ): Promise<Omit<User, 'password'>[]> {
    const assignments = await this.workItemEmployeeAssignmentsRepository.find({
      where: { work_item_id: workItemId },
      relations: ['employee'],
    });

    return assignments.map((assignment) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...employeeWithoutPassword } = assignment.employee;
      return employeeWithoutPassword;
    });
  }

  async assignMultipleEmployeesToWorkItem(
    contractorId: string,
    workItemId: string,
    employeeIds: string[],
  ): Promise<AssignMultipleEmployeesResponseDto> {
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

    const created: WorkItemEmployeeAssignment[] = [];
    const failed: Array<{ employee_id: string; error: string }> = [];

    for (const employeeId of employeeIds) {
      try {
        const employee = await this.usersRepository.findOne({
          where: { id: employeeId },
        });

        if (!employee || employee.role !== UserRole.EM) {
          failed.push({
            employee_id: employeeId,
            error: 'Employee not found or is not an employee user',
          });
          continue;
        }

        const existingAssignment =
          await this.workItemEmployeeAssignmentsRepository.findOne({
            where: { work_item_id: workItemId, employee_id: employeeId },
          });

        if (existingAssignment) {
          created.push(existingAssignment);
          continue;
        }

        const assignment = this.workItemEmployeeAssignmentsRepository.create({
          work_item_id: workItemId,
          employee_id: employeeId,
        });

        const savedAssignment =
          await this.workItemEmployeeAssignmentsRepository.save(assignment);
        created.push(savedAssignment);
      } catch (error) {
        failed.push({
          employee_id: employeeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      created,
      failed,
      summary: {
        total: employeeIds.length,
        created: created.length,
        failed: failed.length,
      },
    };
  }

  async update(
    id: string,
    updateWorkItemDto: UpdateWorkItemDto,
  ): Promise<WorkItem> {
    const workItem = await this.findOne(id);

    if (updateWorkItemDto.hasOwnProperty('agreement_id')) {
      const newAgreementId = updateWorkItemDto.agreement_id
        ? updateWorkItemDto.agreement_id
        : null;
      if (newAgreementId !== workItem.agreement_id) {
        if (newAgreementId) {
          const agreement = await this.workItemsRepository.manager.findOne(
            Agreement,
            {
              where: { id: newAgreementId },
              relations: ['contractor'],
            },
          );
          if (!agreement) {
            throw new NotFoundException(
              `Agreement #${newAgreementId} not found`,
            );
          }
          workItem.agreement_id = newAgreementId;
          workItem.agreement = agreement;
          workItem.contractor_id = agreement.contractor_id ?? null;
          workItem.contractor = (agreement.contractor ?? null) as any;
        } else {
          workItem.agreement_id = null;
          workItem.agreement = null;
          workItem.contractor_id = null;
          workItem.contractor = null as any;
        }
      }
    }

    if (updateWorkItemDto.hasOwnProperty('sr')) {
      workItem.serial_no = updateWorkItemDto.sr ?? null;
    }

    const { sr, agreement_id, ...remainingDto } = updateWorkItemDto;

    const locationRelations = [
      { idKey: 'district_id', relationKey: 'district' },
      { idKey: 'block_id', relationKey: 'block' },
      { idKey: 'panchayat_id', relationKey: 'panchayat' },
      { idKey: 'village_id', relationKey: 'village' },
      { idKey: 'subdivision_id', relationKey: 'subdivision' },
      { idKey: 'circle_id', relationKey: 'circle' },
      { idKey: 'zone_id', relationKey: 'zone' },
    ];

    for (const rel of locationRelations) {
      if (remainingDto.hasOwnProperty(rel.idKey)) {
        const newId = remainingDto[rel.idKey] ? remainingDto[rel.idKey] : null;
        if (newId !== workItem[rel.idKey]) {
          workItem[rel.idKey] = newId;
          workItem[rel.relationKey] = null;
        }
      }
    }

    Object.assign(workItem, remainingDto);
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

  async findWithoutAgreement(
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
      where: { agreement_id: IsNull() },
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

  async remove(id: string): Promise<void> {
    const workItem = await this.findOne(id);
    await this.workItemsRepository.remove(workItem);
  }
}
