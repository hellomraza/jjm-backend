import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UploadPhotoDto } from '../photos/dto/upload-photo.dto';
import { Photo } from '../photos/entities/photo.entity';
import { PhotosService } from '../photos/photos.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { UpdateWorkItemComponentDto } from './dto/update-work-item-component.dto';
import { UploadComponentPhotoDto } from './dto/upload-component-photo.dto';
import { Component } from './entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from './entities/work-item-component.entity';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(WorkItemComponent)
    private readonly workItemComponentRepo: Repository<WorkItemComponent>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly photosService: PhotosService,
    private readonly dataSource: DataSource,
  ) {}

  async findMasterComponents(): Promise<Component[]> {
    return this.componentRepo.find({
      order: { order_number: 'ASC' },
    });
  }

  async findByWorkItem(workItemId: string): Promise<WorkItemComponent[]> {
    return this.workItemComponentRepo.find({
      where: { work_item_id: workItemId },
      relations: ['component'],
      order: {
        component: {
          order_number: 'ASC',
        },
      },
    });
  }

  async findOneMapping(id: string): Promise<WorkItemComponent> {
    const mapping = await this.workItemComponentRepo.findOne({
      where: { id },
      relations: ['component', 'workItem'],
    });

    if (!mapping) {
      throw new NotFoundException(
        `Work item component mapping with ID ${id} not found`,
      );
    }

    return mapping;
  }

  async updateMapping(
    id: string,
    updateDto: UpdateWorkItemComponentDto,
  ): Promise<WorkItemComponent> {
    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const mapping = await this.findOneMapping(id);
    Object.assign(mapping, updateDto);
    const updated = await this.workItemComponentRepo.save(mapping);

    if (updateDto.status) {
      await this.recalculateProgress(mapping.work_item_id);
    }

    return updated;
  }

  async recalculateProgress(
    workItemId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repositoryManager = manager ?? this.workItemComponentRepo.manager;

    const totalComponents = await repositoryManager.count(WorkItemComponent, {
      where: { work_item_id: workItemId },
    });

    const approvedComponents = await repositoryManager.count(
      WorkItemComponent,
      {
        where: {
          work_item_id: workItemId,
          status: WorkItemComponentStatus.APPROVED,
        },
      },
    );

    const progress =
      totalComponents === 0
        ? 0
        : Number(((approvedComponents / totalComponents) * 100).toFixed(2));

    await repositoryManager.update(WorkItem, workItemId, {
      progress_percentage: progress,
    });
  }

  async submitPhoto(
    componentId: string,
    photoId: string,
    contractorId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.selectPhoto(componentId, photoId, contractorId);
  }

  async uploadPhoto(
    componentId: string,
    file: Express.Multer.File,
    uploadDto: UploadComponentPhotoDto,
    employeeId: string,
  ): Promise<Photo> {
    const componentMapping = await this.workItemComponentRepo.findOne({
      where: { id: componentId },
      relations: ['workItem'],
    });

    if (!componentMapping) {
      throw new NotFoundException(
        `Work item component mapping with ID ${componentId} not found`,
      );
    }

    if (componentMapping.status === WorkItemComponentStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot upload photo for an already approved component',
      );
    }

    const employee = await this.userRepo.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`User with ID ${employeeId} not found`);
    }

    if (employee.role !== UserRole.EM) {
      throw new ForbiddenException('Only employee can upload component photos');
    }

    if (
      componentMapping.quantity === null ||
      componentMapping.quantity === undefined
    ) {
      throw new BadRequestException(
        'Component quantity must be set before uploading progress photos',
      );
    }

    await this.validateProgressSequence(componentMapping);

    const quantity = Number(componentMapping.quantity);
    const currentProgress = Number(componentMapping.progress ?? 0);
    const newProgress = Number(uploadDto.progress);

    if (Number.isNaN(newProgress) || newProgress <= 0) {
      throw new BadRequestException('Progress must be greater than 0');
    }

    if (newProgress > quantity) {
      throw new BadRequestException(
        'Progress cannot exceed component quantity',
      );
    }

    if (newProgress < currentProgress) {
      throw new BadRequestException('Progress must not decrease');
    }

    const uploadPhotoDto: UploadPhotoDto = {
      latitude: uploadDto.latitude,
      longitude: uploadDto.longitude,
      timestamp: uploadDto.timestamp,
      component_id: componentId,
      work_item_id: componentMapping.work_item_id,
    };

    const savedPhoto = await this.photosService.uploadPhoto(
      file,
      uploadPhotoDto,
      employeeId,
    );

    componentMapping.progress = newProgress;
    componentMapping.status =
      newProgress < quantity
        ? WorkItemComponentStatus.IN_PROGRESS
        : componentMapping.status;
    await this.workItemComponentRepo.save(componentMapping);

    return savedPhoto;
  }

  private async validateProgressSequence(
    componentMapping: WorkItemComponent,
  ): Promise<void> {
    const siblingMappings = await this.workItemComponentRepo.find({
      where: { work_item_id: componentMapping.work_item_id },
      relations: ['component'],
    });

    const currentMapping = siblingMappings.find(
      (mapping) => mapping.id === componentMapping.id,
    );

    if (!currentMapping || !currentMapping.component) {
      throw new NotFoundException(
        `Work item component mapping with ID ${componentMapping.id} not found`,
      );
    }

    const currentOrder = Number(currentMapping.component.order_number);

    const hasUnapprovedPreviousComponent = siblingMappings.some((mapping) => {
      if (!mapping.component || mapping.id === currentMapping.id) {
        return false;
      }

      return (
        Number(mapping.component.order_number) < currentOrder &&
        mapping.status !== WorkItemComponentStatus.APPROVED
      );
    });

    if (hasUnapprovedPreviousComponent) {
      throw new BadRequestException(
        'Progress updates must follow component order. Previous components must be approved first',
      );
    }

    const hasAnotherInProgressComponent = siblingMappings.some(
      (mapping) =>
        mapping.id !== currentMapping.id &&
        mapping.status === WorkItemComponentStatus.IN_PROGRESS,
    );

    if (hasAnotherInProgressComponent) {
      throw new BadRequestException(
        'Only one component can be in progress at a time for a work item',
      );
    }
  }

  async getComponentPhotos(
    componentId: string,
    contractorId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: Photo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const componentMapping = await this.workItemComponentRepo.findOne({
      where: { id: componentId },
      relations: ['workItem'],
    });

    if (!componentMapping) {
      throw new NotFoundException(
        `Work item component mapping with ID ${componentId} not found`,
      );
    }

    if (componentMapping.workItem.contractor_id !== contractorId) {
      throw new ForbiddenException('Contractor does not own this work item');
    }

    const [data, total] = await this.photoRepo.findAndCount({
      where: { component_id: componentId },
      relations: ['employee', 'selectedByUser'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async selectPhoto(
    componentId: string,
    photoId: string,
    contractorId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const componentMapping = await manager.findOne(WorkItemComponent, {
        where: { id: componentId },
        relations: ['workItem'],
      });

      if (!componentMapping) {
        throw new NotFoundException(
          `Work item component mapping with ID ${componentId} not found`,
        );
      }

      if (componentMapping.workItem.contractor_id !== contractorId) {
        throw new ForbiddenException('Contractor does not own this work item');
      }

      if (
        ![
          WorkItemComponentStatus.PENDING,
          WorkItemComponentStatus.IN_PROGRESS,
          WorkItemComponentStatus.REJECTED,
        ].includes(componentMapping.status)
      ) {
        throw new BadRequestException(
          'Only pending, in-progress, or rejected components can be submitted',
        );
      }

      if (
        componentMapping.quantity === null ||
        componentMapping.quantity === undefined
      ) {
        throw new BadRequestException(
          'Component quantity must be set before submission',
        );
      }

      const quantity = Number(componentMapping.quantity);
      const progress = Number(componentMapping.progress ?? 0);

      if (progress < quantity) {
        throw new BadRequestException(
          'Component cannot be submitted until progress equals quantity',
        );
      }

      if (
        componentMapping.status === WorkItemComponentStatus.REJECTED &&
        componentMapping.approved_photo_id === photoId
      ) {
        throw new BadRequestException(
          'Rejected photo cannot be reselected. Please select another photo',
        );
      }

      const photo = await manager.findOne(Photo, {
        where: {
          id: photoId,
          component_id: componentId,
        },
        relations: ['employee'],
      });

      if (!photo) {
        throw new NotFoundException(
          'Photo not found for the provided component',
        );
      }

      if (photo.employee.role !== UserRole.EM) {
        throw new BadRequestException(
          'Selected photo must be uploaded by an employee',
        );
      }

      await manager.update(
        Photo,
        { component_id: componentId },
        {
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        },
      );

      await manager.update(
        Photo,
        { id: photoId },
        {
          is_selected: true,
          selected_by: contractorId,
          selected_at: new Date(),
          is_forwarded_to_do: true,
          forwarded_at: new Date(),
        },
      );

      componentMapping.approved_photo_id = photoId;
      componentMapping.status = WorkItemComponentStatus.SUBMITTED;

      await manager.save(WorkItemComponent, componentMapping);
    });

    return {
      success: true,
      message: 'Photo selected and submitted for approval',
    };
  }

  async approveComponent(
    componentId: string,
    districtOfficerId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const districtOfficer = await manager.findOne(User, {
        where: { id: districtOfficerId },
      });

      if (!districtOfficer) {
        throw new NotFoundException(
          `User with ID ${districtOfficerId} not found`,
        );
      }

      if (districtOfficer.role !== UserRole.DO) {
        throw new ForbiddenException('Only district officers can approve');
      }

      const componentMapping = await manager.findOne(WorkItemComponent, {
        where: { id: componentId },
        relations: ['workItem'],
      });

      if (!componentMapping) {
        throw new NotFoundException(
          `Work item component mapping with ID ${componentId} not found`,
        );
      }

      if (componentMapping.status !== WorkItemComponentStatus.SUBMITTED) {
        throw new BadRequestException(
          'Only submitted components can be approved',
        );
      }

      if (!districtOfficer.district_id) {
        throw new BadRequestException(
          'District officer district is not configured',
        );
      }

      if (
        districtOfficer.district_id !== componentMapping.workItem.district_id
      ) {
        throw new ForbiddenException(
          'District officer does not belong to this work item district',
        );
      }

      if (!componentMapping.approved_photo_id) {
        throw new BadRequestException('No selected photo found for approval');
      }

      const selectedPhoto = await manager.findOne(Photo, {
        where: {
          id: componentMapping.approved_photo_id,
          component_id: componentId,
        },
      });

      if (!selectedPhoto) {
        throw new BadRequestException(
          'Selected photo does not belong to component',
        );
      }

      if (
        componentMapping.quantity !== null &&
        componentMapping.quantity !== undefined
      ) {
        const quantity = Number(componentMapping.quantity);
        const progress = Number(componentMapping.progress ?? 0);

        if (!Number.isNaN(quantity) && progress < quantity) {
          componentMapping.progress = quantity;
        }
      }

      componentMapping.status = WorkItemComponentStatus.APPROVED;
      await manager.save(WorkItemComponent, componentMapping);
      await this.recalculateProgress(componentMapping.work_item_id, manager);
    });

    return {
      success: true,
      message: 'Component approved successfully',
    };
  }

  async rejectComponent(
    componentId: string,
    districtOfficerId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const districtOfficer = await manager.findOne(User, {
        where: { id: districtOfficerId },
      });

      if (!districtOfficer) {
        throw new NotFoundException(
          `User with ID ${districtOfficerId} not found`,
        );
      }

      if (districtOfficer.role !== UserRole.DO) {
        throw new ForbiddenException('Only district officers can reject');
      }

      const componentMapping = await manager.findOne(WorkItemComponent, {
        where: { id: componentId },
        relations: ['workItem'],
      });

      if (!componentMapping) {
        throw new NotFoundException(
          `Work item component mapping with ID ${componentId} not found`,
        );
      }

      if (componentMapping.status !== WorkItemComponentStatus.SUBMITTED) {
        throw new BadRequestException(
          'Only submitted components can be rejected',
        );
      }

      if (!districtOfficer.district_id) {
        throw new BadRequestException(
          'District officer district is not configured',
        );
      }

      if (
        districtOfficer.district_id !== componentMapping.workItem.district_id
      ) {
        throw new ForbiddenException(
          'District officer does not belong to this work item district',
        );
      }

      if (!componentMapping.approved_photo_id) {
        throw new BadRequestException('No selected photo found for rejection');
      }

      const selectedPhoto = await manager.findOne(Photo, {
        where: {
          id: componentMapping.approved_photo_id,
          component_id: componentId,
        },
      });

      if (!selectedPhoto) {
        throw new BadRequestException(
          'Selected photo does not belong to component',
        );
      }

      await manager.update(
        Photo,
        { id: componentMapping.approved_photo_id },
        {
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        },
      );

      componentMapping.status = WorkItemComponentStatus.REJECTED;
      await manager.save(WorkItemComponent, componentMapping);
      await this.recalculateProgress(componentMapping.work_item_id, manager);
    });

    return {
      success: true,
      message: 'Component rejected. Contractor must select another photo',
    };
  }

  async getPendingApproval(
    districtOfficerId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: WorkItemComponent[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const districtOfficer = await this.userRepo.findOne({
      where: { id: districtOfficerId },
    });

    if (!districtOfficer) {
      throw new NotFoundException(
        `User with ID ${districtOfficerId} not found`,
      );
    }

    if (districtOfficer.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only district officers can access this view',
      );
    }

    if (!districtOfficer.district_id) {
      throw new BadRequestException(
        'District officer district is not configured',
      );
    }

    const query = this.workItemComponentRepo
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.component', 'master_component')
      .leftJoinAndSelect('component.workItem', 'work_item')
      .where('component.status = :status', {
        status: WorkItemComponentStatus.SUBMITTED,
      })
      .andWhere('work_item.district_id = :districtId', {
        districtId: districtOfficer.district_id,
      })
      .orderBy('component.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApprovedComponents(
    page: number,
    limit: number,
  ): Promise<{
    data: WorkItemComponent[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await this.workItemComponentRepo.findAndCount({
      where: { status: WorkItemComponentStatus.APPROVED },
      relations: ['component', 'workItem'],
      order: { updated_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
