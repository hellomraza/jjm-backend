import {
  BadRequestException,
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
import { UploadService } from '../../common/upload/upload.service';
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
import { TpiStaffRelationship } from '../users/entities/tpi-staff-relationship.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AssignMultipleEmployeesResponseDto } from './dto/assign-work-item-employee.dto';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { SubmitBankDetailsDto } from './dto/submit-bank-details.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import {
  BankDetailsStatus,
  WorkItemBankDetail,
} from './entities/work-item-bank-detail.entity';
import { WorkItemEmployeeAssignment } from './entities/work-item-employee-assignment.entity';
import { WorkItemTpiStaffAssignment } from './entities/work-item-tpi-staff-assignment.entity';
import {
  WorkItem,
  WorkItemStatus,
  WorkOrderType,
} from './entities/work-item.entity';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
    @InjectRepository(WorkItemEmployeeAssignment)
    private readonly workItemEmployeeAssignmentsRepository: Repository<WorkItemEmployeeAssignment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(WorkItemBankDetail)
    private readonly bankDetailsRepository: Repository<WorkItemBankDetail>,
    private readonly agreementsService: AgreementsService,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
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
    tpi: true,
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
      const type = createWorkItemDto.work_order_type || WorkOrderType.SVS;
      const masterComponents = await manager.find(Component, {
        where: { work_order_type: type },
        order: { order_number: 'ASC' },
      });

      const expectedCount = type === WorkOrderType.BULK_VILLAGE ? 8 : 12;
      if (masterComponents.length !== expectedCount) {
        throw new NotFoundException(
          `Expected ${expectedCount} static components for type ${type}, found ${masterComponents.length}`,
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

      const {
        sr,
        agreement_id,
        title,
        latitude,
        longitude,
        work_order_type,
        ...rest
      } = createWorkItemDto;

      if (isNew) {
        workItem = manager.create(WorkItem, {
          ...rest,
          title: title || createWorkItemDto.work_code,
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          serial_no: sr ?? null,
          agreement_id: agreement_id ?? null,
          contractor_id: contractorId,
          work_order_type: type,
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
          work_order_type: type,
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
        mapping.component_name = component.name;
        mapping.component_unit = component.unit;
        mapping.component_order_number = component.order_number;
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
    workOrderType: WorkOrderType = WorkOrderType.SVS,
  ): Promise<WorkItem[]> {
    console.log(workOrderType);
    return this.dataSource.transaction(async (manager) => {
      const createdWorkItems: WorkItem[] = [];

      const masterComponents = await manager.find(Component, {
        where: { work_order_type: workOrderType },
        order: { order_number: 'ASC' },
      });

      const expectedCount =
        workOrderType === WorkOrderType.BULK_VILLAGE ? 8 : 12;
      if (masterComponents.length !== expectedCount) {
        throw new NotFoundException(
          `Expected ${expectedCount} static components for type ${workOrderType}, found ${masterComponents.length}`,
        );
      }

      for (const workItemImport of workItemImports) {
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

        let inferredAgreementId: string | null = null;

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
          work_order_type: workOrderType,
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
            contractor_id: _contractorId,
            agreement_id: _agreementId,
            ...updatableWorkItemFields
          }: Partial<WorkItem> = {
            ...workItem,
          };

          const finalAgreementId =
            inferredAgreementId ?? existingWorkItem.agreement_id ?? null;

          Object.assign(existingWorkItem, {
            ...updatableWorkItemFields,
            agreement_id: finalAgreementId,
            work_order_type: workOrderType,
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
            mapping.component_name = component.name;
            mapping.component_unit = component.unit;
            mapping.component_order_number = component.order_number;
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
          mapping.component_name = component.name;
          mapping.component_unit = component.unit;
          mapping.component_order_number = component.order_number;
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
    workOrderType?: WorkOrderType,
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

    if (role === UserRole.TPI) {
      where = { tpi_id: userId };
    }

    if (role === UserRole.TPI_STAFF) {
      const assignedRows = await this.dataSource
        .getRepository(WorkItemTpiStaffAssignment)
        .find({
          where: { staff_id: userId },
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

    if (workOrderType) {
      where.work_order_type = workOrderType;
    }

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

  async findCompletedWorkItemsForDO(
    userId: string,
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

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only district officers can access completed workflows',
      );
    }
    if (!user.district_id) {
      throw new BadRequestException(
        'District officer district is not configured',
      );
    }

    const where: FindOptionsWhere<WorkItem> = {
      status: WorkItemStatus.COMPLETED,
      district_id: user.district_id,
    };

    if (search) {
      where.work_code = ILike(`%${search}%`);
    }

    const [items, total] = await this.workItemsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { updated_at: 'DESC' },
      relations: {
        ...this.locationRelations,
        bankDetails: true,
      },
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async submitBankDetails(
    workItemId: string,
    file: any,
    dto: SubmitBankDetailsDto,
    userId: string,
  ): Promise<WorkItemBankDetail> {
    // Validate user role
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only district officers can submit bank details',
      );
    }

    // Find the completed work item
    const workItem = await this.workItemsRepository.findOne({
      where: { id: workItemId },
    });
    if (!workItem) {
      throw new NotFoundException(`Work item with ID ${workItemId} not found`);
    }
    if (workItem.status !== WorkItemStatus.COMPLETED) {
      throw new BadRequestException(
        'Bank details can only be submitted for completed work items',
      );
    }
    if (user.district_id !== workItem.district_id) {
      throw new ForbiddenException(
        'District officer does not belong to this work item district',
      );
    }

    // Resolve voucher file URL
    let fileUrl = dto.voucher_file_url;

    if (file) {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectKey = `work-items/${workItemId}/vouchers/${Date.now()}-${sanitizedName}`;

      try {
        const uploadResult = await this.uploadService.uploadObject({
          objectKey,
          body: file.buffer,
          contentType: file.mimetype,
        });
        fileUrl = uploadResult.url;
      } catch (err) {
        throw new InternalServerErrorException('Failed to upload voucher file');
      }
    }

    if (!fileUrl) {
      throw new BadRequestException('Voucher file is required');
    }

    // Check if bank details already exist
    let bankDetail = await this.bankDetailsRepository.findOne({
      where: { work_item_id: workItemId },
    });

    const bankDetailData = {
      bank_account_name: dto.bank_account_name,
      bank_account_number: dto.bank_account_number,
      ifsc_code: dto.ifsc_code,
      bank_name: dto.bank_name || null,
      account_type: dto.account_type || null,
      bank_address: dto.bank_address || null,
      mobile: dto.mobile || null,
      email: dto.email || null,
      voucher_number: dto.voucher_number,
      voucher_file_url: fileUrl,
      status: BankDetailsStatus.SUBMITTED,
      submitted_at: new Date(),
    };

    if (bankDetail) {
      if (bankDetail.status === BankDetailsStatus.APPROVED) {
        throw new BadRequestException(
          'Approved bank details cannot be modified',
        );
      }
      Object.assign(bankDetail, bankDetailData);
    } else {
      bankDetail = this.bankDetailsRepository.create({
        work_item_id: workItemId,
        ...bankDetailData,
      });
    }

    return await this.bankDetailsRepository.save(bankDetail);
  }

  async approveBankDetails(
    workItemId: string,
    userId: string,
  ): Promise<WorkItemBankDetail> {
    // Validate user role
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only district officers can approve bank details',
      );
    }

    // Find bank details
    const bankDetail = await this.bankDetailsRepository.findOne({
      where: { work_item_id: workItemId },
      relations: ['workItem'],
    });
    if (!bankDetail) {
      throw new NotFoundException(
        `Bank details for work item ID ${workItemId} not found`,
      );
    }

    if (user.district_id !== bankDetail.workItem.district_id) {
      throw new ForbiddenException(
        'District officer does not belong to this work item district',
      );
    }

    if (bankDetail.status === BankDetailsStatus.APPROVED) {
      throw new BadRequestException('Bank details are already approved');
    }

    bankDetail.status = BankDetailsStatus.APPROVED;
    bankDetail.approved_at = new Date();
    bankDetail.approved_by_id = userId;

    return await this.bankDetailsRepository.save(bankDetail);
  }

  async assignTpi(workItemId: string, doUserId: string): Promise<WorkItem> {
    return await this.dataSource.transaction(async (manager) => {
      const doUser = await manager.findOne(User, { where: { id: doUserId } });
      if (!doUser || doUser.role !== UserRole.DO) {
        throw new ForbiddenException('Only District Officers can assign TPIs');
      }

      if (!doUser.is_executive_engineer) {
        throw new ForbiddenException(
          'Only Executive Engineers can assign TPIs',
        );
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: workItemId },
      });
      if (!workItem) {
        throw new NotFoundException(`Work item #${workItemId} not found`);
      }

      if (workItem.work_order_type !== WorkOrderType.BULK_VILLAGE) {
        throw new BadRequestException(
          'TPI can only be assigned to Bulk Village work items',
        );
      }

      if (doUser.district_id !== workItem.district_id) {
        throw new ForbiddenException(
          'District Officer does not belong to this work item district',
        );
      }

      // Automatically resolve the active TPI for the district
      const activeTpi = await manager.findOne(User, {
        where: {
          role: UserRole.TPI,
          district_id: doUser.district_id,
          is_active: true,
        },
      });

      if (!activeTpi) {
        throw new BadRequestException(
          `No active TPI agency found in district ${doUser.district_id}`,
        );
      }

      workItem.tpi_id = activeTpi.id;
      workItem.tpi_assigned_by_id = doUser.id;
      workItem.tpi_assigned_at = new Date();

      return await manager.save(WorkItem, workItem);
    });
  }

  async unassignTpi(workItemId: string, doUserId: string): Promise<WorkItem> {
    return await this.dataSource.transaction(async (manager) => {
      const doUser = await manager.findOne(User, { where: { id: doUserId } });
      if (!doUser || doUser.role !== UserRole.DO) {
        throw new ForbiddenException(
          'Only District Officers can unassign TPIs',
        );
      }

      if (!doUser.is_executive_engineer) {
        throw new ForbiddenException(
          'Only Executive Engineers can unassign TPIs',
        );
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: workItemId },
      });
      if (!workItem) {
        throw new NotFoundException(`Work item #${workItemId} not found`);
      }

      if (workItem.work_order_type !== WorkOrderType.BULK_VILLAGE) {
        throw new BadRequestException(
          'TPI operations are only supported for Bulk Village work items',
        );
      }

      if (doUser.district_id !== workItem.district_id) {
        throw new ForbiddenException(
          'District Officer does not belong to this work item district',
        );
      }

      workItem.tpi_id = null;
      workItem.tpi_assigned_by_id = null;
      workItem.tpi_assigned_at = null;

      // Also clean up any active staff assignments for this work item
      await manager.delete(WorkItemTpiStaffAssignment, {
        work_item_id: workItemId,
      });

      return await manager.save(WorkItem, workItem);
    });
  }

  async assignTpiStaff(
    workItemId: string,
    tpiId: string,
    staffId: string,
  ): Promise<WorkItemTpiStaffAssignment> {
    return await this.dataSource.transaction(async (manager) => {
      const tpi = await manager.findOne(User, {
        where: { id: tpiId, role: UserRole.TPI },
      });
      if (!tpi || !tpi.is_active) {
        throw new ForbiddenException('Access denied or inactive TPI agency');
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: workItemId },
      });
      if (!workItem) {
        throw new NotFoundException(`Work item #${workItemId} not found`);
      }

      if (workItem.tpi_id !== tpi.id) {
        throw new ForbiddenException(
          'This work item is not assigned to your TPI agency',
        );
      }

      // Verify staff belongs to TPI
      const rel = await manager.findOne(TpiStaffRelationship, {
        where: { staff_id: staffId, tpi_id: tpi.id },
      });
      if (!rel) {
        throw new ForbiddenException(
          'Staff member does not belong to your TPI agency',
        );
      }

      const staff = await manager.findOne(User, {
        where: { id: staffId, role: UserRole.TPI_STAFF },
      });
      if (!staff || !staff.is_active) {
        throw new BadRequestException('Staff member not found or inactive');
      }

      // Check if assignment already exists
      const existing = await manager.findOne(WorkItemTpiStaffAssignment, {
        where: { work_item_id: workItemId, staff_id: staffId },
      });
      if (existing) {
        return existing;
      }

      const assignment = manager.create(WorkItemTpiStaffAssignment, {
        work_item_id: workItemId,
        staff_id: staffId,
      });

      return await manager.save(WorkItemTpiStaffAssignment, assignment);
    });
  }

  async unassignTpiStaff(
    workItemId: string,
    tpiId: string,
    staffId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const tpi = await manager.findOne(User, {
        where: { id: tpiId, role: UserRole.TPI },
      });
      if (!tpi || !tpi.is_active) {
        throw new ForbiddenException('Access denied or inactive TPI agency');
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: workItemId },
      });
      if (!workItem) {
        throw new NotFoundException(`Work item #${workItemId} not found`);
      }

      if (workItem.tpi_id !== tpi.id) {
        throw new ForbiddenException(
          'This work item is not assigned to your TPI agency',
        );
      }

      await manager.delete(WorkItemTpiStaffAssignment, {
        work_item_id: workItemId,
        staff_id: staffId,
      });
    });
  }

  async getAssignedTpiStaff(
    workItemId: string,
  ): Promise<Omit<User, 'password'>[]> {
    const assignments = await this.dataSource
      .getRepository(WorkItemTpiStaffAssignment)
      .find({
        where: { work_item_id: workItemId },
        relations: ['staff'],
      });

    return assignments.map((assignment) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...staffWithoutPassword } = assignment.staff;
      return staffWithoutPassword;
    });
  }
}
