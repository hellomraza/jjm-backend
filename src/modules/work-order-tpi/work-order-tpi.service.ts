import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Component, ComponentType } from '../components/entities/component.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import {
  PhotoStatusEnum,
} from '../photos/entities/photo-status.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AssignTpiEmployeeDto } from './dto/assign-tpi-employee.dto';
import { AssignTpiDto } from './dto/assign-tpi.dto';
import { CreateWorkOrderTpiDto } from './dto/create-work-order-tpi.dto';
import { WorkOrderTpiAssignment } from './entities/work-order-tpi-assignment.entity';
import {
  WorkItemComponentStatus,
  WorkOrderTpiComponent,
} from './entities/work-order-tpi-component.entity';
import { WorkOrderTpiEmployeeAssignment } from './entities/work-order-tpi-employee-assignment.entity';
import { WorkOrderTpiPhotoStatus } from './entities/work-order-tpi-photo-status.entity';
import { WorkOrderTpiPhoto } from './entities/work-order-tpi-photo.entity';
import { WorkItemStatus, WorkOrderTpi } from './entities/work-order-tpi.entity';
import { STATIC_TPI_COMPONENTS } from './work-order-tpi.constants';

@Injectable()
export class WorkOrderTpiService {
  constructor(
    @InjectRepository(WorkOrderTpi)
    private readonly workOrderTpiRepository: Repository<WorkOrderTpi>,
    @InjectRepository(WorkOrderTpiComponent)
    private readonly componentRepository: Repository<WorkOrderTpiComponent>,
    @InjectRepository(Component)
    private readonly masterComponentRepository: Repository<Component>,
    @InjectRepository(WorkOrderTpiAssignment)
    private readonly tpiAssignmentRepository: Repository<WorkOrderTpiAssignment>,
    @InjectRepository(WorkOrderTpiEmployeeAssignment)
    private readonly employeeAssignmentRepository: Repository<WorkOrderTpiEmployeeAssignment>,
    @InjectRepository(WorkOrderTpiPhoto)
    private readonly photoRepository: Repository<WorkOrderTpiPhoto>,
    @InjectRepository(WorkOrderTpiPhotoStatus)
    private readonly photoStatusRepository: Repository<WorkOrderTpiPhotoStatus>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Agreement)
    private readonly agreementRepository: Repository<Agreement>,
  ) {}

  async create(createDto: CreateWorkOrderTpiDto): Promise<WorkOrderTpi> {
    const existing = await this.workOrderTpiRepository.findOne({
      where: { work_code: createDto.work_code },
    });
    if (existing) {
      throw new ConflictException(
        `WorkOrderTpi with work_code ${createDto.work_code} already exists`,
      );
    }

    let contractorId = createDto.contractor_id;
    if (createDto.agreement_id) {
      const agreement = await this.agreementRepository.findOne({
        where: { id: createDto.agreement_id },
      });
      if (agreement && !contractorId && agreement.contractor_id) {
        contractorId = agreement.contractor_id;
      }
    }

    const workOrderPayload: DeepPartial<WorkOrderTpi> = {
      ...createDto,
      contractor_id: contractorId,
      status: WorkItemStatus.PENDING,
      progress_percentage: createDto.progress_percentage ?? 0,
    };

    const created = this.workOrderTpiRepository.create(workOrderPayload);
    const saved = await this.workOrderTpiRepository.save(created);

    // Fetch master TPI components or fallback to constants
    const masterComponents = await this.masterComponentRepository.find({
      where: { type: ComponentType.TPI },
      order: { order_number: 'ASC' },
    });

    const componentsToCreate = (
      masterComponents.length > 0 ? masterComponents : STATIC_TPI_COMPONENTS
    ).map((tpl: any) =>
      this.componentRepository.create({
        work_order_tpi_id: saved.id,
        component_id: tpl.id || undefined,
        name: tpl.name,
        unit: tpl.unit,
        order_number: tpl.order_number,
        status: WorkItemComponentStatus.PENDING,
        progress: 0,
      }),
    );
    await this.componentRepository.save(componentsToCreate);

    const result = await this.workOrderTpiRepository.findOne({
      where: { id: saved.id },
      relations: ['components', 'district', 'contractor', 'agreement'],
    });

    return result!;
  }

  async findAll(
    role: UserRole,
    userId: string,
    districtId?: string,
    agreementId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: WorkOrderTpi[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.workOrderTpiRepository
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.district', 'district')
      .leftJoinAndSelect('wo.block', 'block')
      .leftJoinAndSelect('wo.panchayat', 'panchayat')
      .leftJoinAndSelect('wo.village', 'village')
      .leftJoinAndSelect('wo.contractor', 'contractor')
      .leftJoinAndSelect('wo.agreement', 'agreement')
      .leftJoinAndSelect('wo.components', 'components')
      .leftJoinAndSelect('wo.tpiAssignment', 'tpiAssignment')
      .leftJoinAndSelect('tpiAssignment.tpi', 'assignedTpi');

    if (role === UserRole.HO) {
      if (districtId) {
        qb.andWhere('wo.district_id = :districtId', { districtId });
      }
      if (agreementId) {
        qb.andWhere('wo.agreement_id = :agreementId', { agreementId });
      }
    } else if (role === UserRole.DO) {
      const doUser = await this.userRepository.findOne({
        where: { id: userId, role: UserRole.DO },
        select: ['id', 'district_id'],
      });
      if (!doUser?.district_id) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      qb.andWhere('wo.district_id = :districtId', {
        districtId: doUser.district_id,
      });
      if (agreementId) {
        qb.andWhere('wo.agreement_id = :agreementId', { agreementId });
      }
    } else if (role === UserRole.CO) {
      qb.andWhere('wo.contractor_id = :contractorId', { contractorId: userId });
      if (agreementId) {
        qb.andWhere('wo.agreement_id = :agreementId', { agreementId });
      }
    } else if (role === UserRole.EM) {
      qb.innerJoin(
        'work_order_tpi_employee_assignments',
        'ea',
        'ea.work_order_tpi_id = wo.id AND ea.employee_id = :empId',
        { empId: userId },
      );
      if (agreementId) {
        qb.andWhere('wo.agreement_id = :agreementId', { agreementId });
      }
    } else if (role === UserRole.TPI) {
      qb.innerJoin(
        'work_order_tpi_assignments',
        'ta',
        'ta.work_order_tpi_id = wo.id AND ta.tpi_id = :tpiId',
        { tpiId: userId },
      );
      if (agreementId) {
        qb.andWhere('wo.agreement_id = :agreementId', { agreementId });
      }
    }

    qb.orderBy('wo.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    role: UserRole,
    userId: string,
  ): Promise<WorkOrderTpi> {
    const workOrder = await this.workOrderTpiRepository.findOne({
      where: { id },
      relations: [
        'district',
        'block',
        'panchayat',
        'village',
        'subdivision',
        'circle',
        'zone',
        'contractor',
        'agreement',
        'components',
        'tpiAssignment',
        'tpiAssignment.tpi',
      ],
      order: {
        components: {
          order_number: 'ASC',
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`WorkOrderTpi #${id} not found`);
    }

    if (role === UserRole.DO) {
      const doUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['district_id'],
      });
      if (doUser?.district_id && workOrder.district_id !== doUser.district_id) {
        throw new ForbiddenException('Access denied for this district');
      }
    } else if (role === UserRole.CO) {
      if (workOrder.contractor_id !== userId) {
        throw new ForbiddenException('Access denied for this work order');
      }
    } else if (role === UserRole.EM) {
      const assignment = await this.employeeAssignmentRepository.findOne({
        where: { work_order_tpi_id: id, employee_id: userId },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this work order');
      }
    } else if (role === UserRole.TPI) {
      const assignment = await this.tpiAssignmentRepository.findOne({
        where: { work_order_tpi_id: id, tpi_id: userId },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this work order');
      }
    }

    return workOrder;
  }

  async assignTpi(
    workOrderTpiId: string,
    dto: AssignTpiDto,
    doUserId: string,
  ): Promise<WorkOrderTpiAssignment> {
    const doUser = await this.userRepository.findOne({
      where: { id: doUserId, role: UserRole.DO },
    });
    if (!doUser) {
      throw new ForbiddenException('Only District Officers can assign TPI');
    }
    if (!doUser.is_executive_engineer) {
      throw new ForbiddenException(
        'Only District Officers with Executive Engineer permission can assign TPI',
      );
    }

    const workOrder = await this.workOrderTpiRepository.findOne({
      where: { id: workOrderTpiId },
    });
    if (!workOrder) {
      throw new NotFoundException(`WorkOrderTpi #${workOrderTpiId} not found`);
    }

    if (doUser.district_id && workOrder.district_id !== doUser.district_id) {
      throw new ForbiddenException(
        'You can only assign TPI to work orders in your district',
      );
    }

    const tpiUser = await this.userRepository.findOne({
      where: { id: dto.tpi_id, role: UserRole.TPI },
    });
    if (!tpiUser) {
      throw new NotFoundException(`TPI officer #${dto.tpi_id} not found`);
    }

    if (tpiUser.district_id !== workOrder.district_id) {
      throw new BadRequestException(
        'The assigned TPI officer must belong to the same district as the work order',
      );
    }

    let assignment = await this.tpiAssignmentRepository.findOne({
      where: { work_order_tpi_id: workOrderTpiId },
    });

    if (assignment) {
      assignment.tpi_id = dto.tpi_id;
      assignment.assigned_by_id = doUserId;
    } else {
      assignment = this.tpiAssignmentRepository.create({
        work_order_tpi_id: workOrderTpiId,
        tpi_id: dto.tpi_id,
        assigned_by_id: doUserId,
      });
    }

    return this.tpiAssignmentRepository.save(assignment);
  }

  async assignEmployees(
    workOrderTpiId: string,
    dto: AssignTpiEmployeeDto,
    contractorUserId: string,
  ): Promise<{ assigned: string[]; failed: string[] }> {
    const workOrder = await this.workOrderTpiRepository.findOne({
      where: { id: workOrderTpiId },
    });
    if (!workOrder) {
      throw new NotFoundException(`WorkOrderTpi #${workOrderTpiId} not found`);
    }

    if (workOrder.contractor_id !== contractorUserId) {
      throw new ForbiddenException(
        'Only the assigned contractor can assign employees to this work order',
      );
    }

    const assigned: string[] = [];
    const failed: string[] = [];

    for (const empId of dto.employee_ids) {
      try {
        const emp = await this.userRepository.findOne({
          where: { id: empId, role: UserRole.EM },
        });
        if (!emp) {
          failed.push(empId);
          continue;
        }

        const existing = await this.employeeAssignmentRepository.findOne({
          where: { work_order_tpi_id: workOrderTpiId, employee_id: empId },
        });

        if (!existing) {
          await this.employeeAssignmentRepository.save(
            this.employeeAssignmentRepository.create({
              work_order_tpi_id: workOrderTpiId,
              employee_id: empId,
            }),
          );
        }
        assigned.push(empId);
      } catch {
        failed.push(empId);
      }
    }

    return { assigned, failed };
  }

  async getAssignedEmployees(workOrderTpiId: string): Promise<User[]> {
    const assignments = await this.employeeAssignmentRepository.find({
      where: { work_order_tpi_id: workOrderTpiId },
      relations: ['employee'],
    });
    return assignments.map((a) => a.employee).filter(Boolean);
  }

  async uploadPhoto(
    workOrderTpiId: string,
    componentId: string,
    userId: string,
    role: UserRole,
    imageUrl: string,
    latitude: number,
    longitude: number,
    timestamp: Date = new Date(),
  ): Promise<WorkOrderTpiPhoto> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId, work_order_tpi_id: workOrderTpiId },
    });
    if (!component) {
      throw new NotFoundException('Component not found for this work order');
    }

    if (role === UserRole.TPI) {
      const assignment = await this.tpiAssignmentRepository.findOne({
        where: { work_order_tpi_id: workOrderTpiId, tpi_id: userId },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to this TPI work order',
        );
      }

      // Strictly 1 photo per component from TPI
      const existingTpiPhoto = await this.photoRepository.findOne({
        where: {
          work_order_tpi_id: workOrderTpiId,
          component_id: componentId,
          uploader_role: UserRole.TPI,
        },
      });

      let photo: WorkOrderTpiPhoto;
      if (existingTpiPhoto) {
        existingTpiPhoto.image_url = imageUrl;
        existingTpiPhoto.latitude = latitude;
        existingTpiPhoto.longitude = longitude;
        existingTpiPhoto.timestamp = timestamp;
        existingTpiPhoto.is_forwarded_to_do = true;
        existingTpiPhoto.forwarded_at = new Date();
        photo = await this.photoRepository.save(existingTpiPhoto);
      } else {
        photo = this.photoRepository.create({
          work_order_tpi_id: workOrderTpiId,
          component_id: componentId,
          uploader_id: userId,
          uploader_role: UserRole.TPI,
          image_url: imageUrl,
          latitude,
          longitude,
          timestamp,
          is_forwarded_to_do: true,
          forwarded_at: new Date(),
        });
        photo = await this.photoRepository.save(photo);

        await this.photoStatusRepository.save(
          this.photoStatusRepository.create({
            photo_id: photo.id,
            work_order_tpi_id: workOrderTpiId,
            component_id: componentId,
            status: PhotoStatusEnum.UPLOADED,
          }),
        );
      }

      return photo;
    } else if (role === UserRole.EM) {
      const empAssignment = await this.employeeAssignmentRepository.findOne({
        where: { work_order_tpi_id: workOrderTpiId, employee_id: userId },
      });
      if (!empAssignment) {
        throw new ForbiddenException(
          'You are not assigned to this work order',
        );
      }

      const photo = this.photoRepository.create({
        work_order_tpi_id: workOrderTpiId,
        component_id: componentId,
        uploader_id: userId,
        uploader_role: UserRole.EM,
        image_url: imageUrl,
        latitude,
        longitude,
        timestamp,
        is_selected: false,
      });
      const savedPhoto = await this.photoRepository.save(photo);

      await this.photoStatusRepository.save(
        this.photoStatusRepository.create({
          photo_id: savedPhoto.id,
          work_order_tpi_id: workOrderTpiId,
          component_id: componentId,
          status: PhotoStatusEnum.UPLOADED,
        }),
      );

      return savedPhoto;
    } else {
      throw new ForbiddenException(
        'Only employees and TPI officers can upload photos',
      );
    }
  }

  async selectPhotoByContractor(
    photoId: string,
    contractorUserId: string,
  ): Promise<WorkOrderTpiPhoto> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId },
      relations: ['workOrderTpi'],
    });
    if (!photo) {
      throw new NotFoundException(`Photo #${photoId} not found`);
    }

    if (photo.uploader_role !== UserRole.EM) {
      throw new BadRequestException('Contractors can only select employee photos');
    }

    if (photo.workOrderTpi.contractor_id !== contractorUserId) {
      throw new ForbiddenException(
        'You can only select photos for your assigned work orders',
      );
    }

    // Unselect previous photos for this component
    await this.photoRepository.update(
      {
        work_order_tpi_id: photo.work_order_tpi_id,
        component_id: photo.component_id,
        uploader_role: UserRole.EM,
      },
      { is_selected: false },
    );

    photo.is_selected = true;
    photo.selected_by = contractorUserId;
    photo.selected_at = new Date();
    photo.is_forwarded_to_do = true;
    photo.forwarded_at = new Date();

    const updated = await this.photoRepository.save(photo);

    let status = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
    });
    if (status) {
      status.status = PhotoStatusEnum.SELECTED;
      status.selected_by = contractorUserId;
      status.selected_at = new Date();
      await this.photoStatusRepository.save(status);
    }

    return updated;
  }

  async getReviewPhotosForComponent(
    workOrderTpiId: string,
    componentId: string,
  ): Promise<{
    component: WorkOrderTpiComponent;
    contractorSelectedPhoto: WorkOrderTpiPhoto | null;
    tpiPhoto: WorkOrderTpiPhoto | null;
    employeePhotos: WorkOrderTpiPhoto[];
  }> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId, work_order_tpi_id: workOrderTpiId },
    });
    if (!component) {
      throw new NotFoundException('Component not found');
    }

    const contractorSelectedPhoto = await this.photoRepository.findOne({
      where: {
        work_order_tpi_id: workOrderTpiId,
        component_id: componentId,
        uploader_role: UserRole.EM,
        is_selected: true,
      },
      relations: ['uploader'],
    });

    const tpiPhoto = await this.photoRepository.findOne({
      where: {
        work_order_tpi_id: workOrderTpiId,
        component_id: componentId,
        uploader_role: UserRole.TPI,
      },
      relations: ['uploader'],
    });

    const employeePhotos = await this.photoRepository.find({
      where: {
        work_order_tpi_id: workOrderTpiId,
        component_id: componentId,
        uploader_role: UserRole.EM,
      },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });

    return {
      component,
      contractorSelectedPhoto,
      tpiPhoto,
      employeePhotos,
    };
  }

  async approveComponent(
    workOrderTpiId: string,
    componentId: string,
    doUserId: string,
    remarks?: string,
  ): Promise<WorkOrderTpiComponent> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId, work_order_tpi_id: workOrderTpiId },
    });
    if (!component) {
      throw new NotFoundException('Component not found');
    }

    const contractorSelectedPhoto = await this.photoRepository.findOne({
      where: {
        work_order_tpi_id: workOrderTpiId,
        component_id: componentId,
        uploader_role: UserRole.EM,
        is_selected: true,
      },
    });

    if (contractorSelectedPhoto) {
      const status = await this.photoStatusRepository.findOne({
        where: { photo_id: contractorSelectedPhoto.id },
      });
      if (status) {
        status.status = PhotoStatusEnum.APPROVED;
        status.approved_by = doUserId;
        status.approved_at = new Date();
        await this.photoStatusRepository.save(status);
      }
      component.approved_photo_id = contractorSelectedPhoto.id;
    }

    component.status = WorkItemComponentStatus.APPROVED;
    component.approved_at = new Date();
    component.progress = 100;
    if (remarks) {
      component.remarks = remarks;
    }

    const savedComponent = await this.componentRepository.save(component);

    // Recalculate work order progress percentage
    const allComponents = await this.componentRepository.find({
      where: { work_order_tpi_id: workOrderTpiId },
    });
    const approvedCount = allComponents.filter(
      (c) => c.status === WorkItemComponentStatus.APPROVED,
    ).length;
    const progressPercentage = Math.round(
      (approvedCount / allComponents.length) * 100,
    );

    const isAllCompleted = approvedCount === allComponents.length;

    await this.workOrderTpiRepository.update(
      { id: workOrderTpiId },
      {
        progress_percentage: progressPercentage,
        status: isAllCompleted
          ? WorkItemStatus.COMPLETED
          : WorkItemStatus.IN_PROGRESS,
      },
    );

    return savedComponent;
  }

  async getTpiAgreements(tpiUserId: string): Promise<Agreement[]> {
    const assignments = await this.tpiAssignmentRepository.find({
      where: { tpi_id: tpiUserId },
      relations: ['workOrderTpi'],
    });

    const agreementIds = Array.from(
      new Set(
        assignments
          .map((a) => a.workOrderTpi?.agreement_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (agreementIds.length === 0) {
      return [];
    }

    return this.agreementRepository
      .createQueryBuilder('ag')
      .where('ag.id IN (:...agreementIds)', { agreementIds })
      .getMany();
  }

  async bulkCreateFromImport(
    workItemImports: any[],
  ): Promise<WorkOrderTpi[]> {
    const created: WorkOrderTpi[] = [];

    for (const item of workItemImports) {
      const workCode = (item.workcode || item.work_code)?.trim();
      const schemetype = item.schemetype?.trim() || 'TPI';
      if (!workCode) continue;

      const districtId =
        item.district_code !== undefined && item.district_code !== null
          ? String(item.district_code)
          : item.district_id !== undefined && item.district_id !== null
          ? String(item.district_id)
          : undefined;

      const blockId =
        item.block_code !== undefined && item.block_code !== null
          ? String(item.block_code)
          : item.block_id !== undefined && item.block_id !== null
          ? String(item.block_id)
          : undefined;

      const panchayatId =
        item.panchayat_code !== undefined && item.panchayat_code !== null
          ? String(item.panchayat_code)
          : item.panchayat_id !== undefined && item.panchayat_id !== null
          ? String(item.panchayat_id)
          : undefined;

      const villageId =
        item.village_code !== undefined && item.village_code !== null
          ? String(item.village_code)
          : item.village_id !== undefined && item.village_id !== null
          ? String(item.village_id)
          : undefined;

      const nofhtc =
        item.nofhtc !== null && item.nofhtc !== undefined
          ? String(item.nofhtc)
          : undefined;

      const amountApproved =
        item.aa_amount !== null && item.aa_amount !== undefined
          ? Number(item.aa_amount)
          : item.amount_approved !== null && item.amount_approved !== undefined
          ? Number(item.amount_approved)
          : undefined;

      const paymentAmount =
        item.payment_rs !== null && item.payment_rs !== undefined
          ? Number(item.payment_rs)
          : item.payment_amount !== null && item.payment_amount !== undefined
          ? Number(item.payment_amount)
          : undefined;

      const serialNo =
        item.sr !== null && item.sr !== undefined
          ? Number(item.sr)
          : item.serial_no !== null && item.serial_no !== undefined
          ? Number(item.serial_no)
          : undefined;

      let contractorId = item.contractor_id ?? undefined;
      let agreementId = item.agreement_id ?? undefined;

      if (!agreementId || !contractorId) {
        const agreement = await this.agreementRepository.findOne({
          where: [
            { workOrderTpis: { work_code: workCode } },
            { workItems: { work_code: workCode } },
          ],
        });
        if (agreement) {
          agreementId = agreement.id;
          contractorId = contractorId || agreement.contractor_id;
        }
      }

      let existing = await this.workOrderTpiRepository.findOne({
        where: { work_code: workCode },
      });

      if (!existing) {
        const workOrderPayload: DeepPartial<WorkOrderTpi> = {
          work_code: workCode,
          schemetype,
          title: item.title || `TPI Work Order ${workCode}`,
          description: item.description,
          district_id: districtId,
          block_id: blockId,
          panchayat_id: panchayatId,
          village_id: villageId,
          nofhtc,
          amount_approved: amountApproved,
          payment_amount: paymentAmount,
          serial_no: serialNo,
          contractor_id: contractorId,
          agreement_id: agreementId,
          latitude: item.latitude ? Number(item.latitude) : undefined,
          longitude: item.longitude ? Number(item.longitude) : undefined,
          progress_percentage: 0,
          status: WorkItemStatus.PENDING,
        };

        const newEntity = this.workOrderTpiRepository.create(workOrderPayload);
        const saved = await this.workOrderTpiRepository.save(newEntity);

        const masterComponents = await this.masterComponentRepository.find({
          where: { type: ComponentType.TPI },
          order: { order_number: 'ASC' },
        });

        const components = (
          masterComponents.length > 0 ? masterComponents : STATIC_TPI_COMPONENTS
        ).map((c: any) =>
          this.componentRepository.create({
            work_order_tpi_id: saved.id,
            component_id: c.id || undefined,
            name: c.name,
            unit: c.unit,
            order_number: c.order_number,
            status: WorkItemComponentStatus.PENDING,
            progress: 0,
          }),
        );
        await this.componentRepository.save(components);
        created.push(saved);
      } else {
        existing.district_id = districtId ?? existing.district_id;
        existing.block_id = blockId ?? existing.block_id;
        existing.panchayat_id = panchayatId ?? existing.panchayat_id;
        existing.village_id = villageId ?? existing.village_id;
        existing.nofhtc = nofhtc ?? existing.nofhtc;
        existing.amount_approved = amountApproved ?? existing.amount_approved;
        existing.payment_amount = paymentAmount ?? existing.payment_amount;
        existing.serial_no = serialNo ?? existing.serial_no;
        existing.contractor_id = contractorId ?? existing.contractor_id;
        existing.agreement_id = agreementId ?? existing.agreement_id;
        existing.schemetype = schemetype ?? existing.schemetype;

        const updated = await this.workOrderTpiRepository.save(existing);
        created.push(updated);
      }
    }

    return created;
  }
}
