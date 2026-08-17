import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UploadPhotoUrlDto } from '../photos/dto/upload-photo-url.dto';
import { UploadPhotoDto } from '../photos/dto/upload-photo.dto';
import { Photo } from '../photos/entities/photo.entity';
import { PhotosService } from '../photos/photos.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { UpdateWorkItemComponentDto } from './dto/update-work-item-component.dto';
import { UploadComponentPhotoUrlDto } from './dto/upload-component-photo-url.dto';
import { UploadComponentPhotoDto } from './dto/upload-component-photo.dto';
import { Component, ComponentType } from './entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from './entities/work-item-component.entity';
import { WorkOrderTpiComponent } from '../work-order-tpi/entities/work-order-tpi-component.entity';
import { WorkOrderTpiPhoto } from '../work-order-tpi/entities/work-order-tpi-photo.entity';
import { WorkOrderTpi, WorkItemStatus } from '../work-order-tpi/entities/work-order-tpi.entity';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(WorkItemComponent)
    private readonly workItemComponentRepo: Repository<WorkItemComponent>,
    @InjectRepository(WorkOrderTpiComponent)
    private readonly workOrderTpiComponentRepo: Repository<WorkOrderTpiComponent>,
    @InjectRepository(WorkOrderTpiPhoto)
    private readonly workOrderTpiPhotoRepo: Repository<WorkOrderTpiPhoto>,
    @InjectRepository(WorkOrderTpi)
    private readonly workOrderTpiRepo: Repository<WorkOrderTpi>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly photosService: PhotosService,
    private readonly dataSource: DataSource,
  ) {}

  async findMasterComponents(type?: ComponentType | string): Promise<Component[]> {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    return this.componentRepo.find({
      where,
      order: { order_number: 'ASC' },
    });
  }

  async findByWorkItem(workItemId: string): Promise<any[]> {
    const svsComponents = await this.workItemComponentRepo.find({
      where: { work_item_id: workItemId },
      relations: ['component'],
      order: {
        component: {
          order_number: 'ASC',
        },
      },
    });

    if (svsComponents && svsComponents.length > 0) {
      return svsComponents;
    }

    // Check TPI work order components
    const tpiComponents = await this.workOrderTpiComponentRepo.find({
      where: { work_order_tpi_id: workItemId },
      relations: ['component', 'photos'],
      order: {
        order_number: 'ASC',
      },
    });

    return tpiComponents.map((c) => ({
      id: c.id,
      work_item_id: c.work_order_tpi_id,
      component_id: c.component_id,
      component: c.component
        ? {
            id: c.component.id,
            name: c.component.name,
            unit: c.component.unit,
            order_number: c.component.order_number,
            type: c.component.type,
          }
        : {
            id: c.component_id,
            name: c.name || 'Component',
            unit: c.unit || 'No.',
            order_number: c.order_number,
            type: 'TPI',
          },
      quantity: c.quantity,
      progress: c.progress,
      status: c.status,
      remarks: c.remarks,
      approved_photo_id: c.approved_photo_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      photos: c.photos,
    }));
  }

  async findOneMapping(id: string): Promise<any> {
    const mapping = await this.workItemComponentRepo.findOne({
      where: { id },
      relations: ['component', 'workItem'],
    });

    if (mapping) {
      return mapping;
    }

    const tpiMapping = await this.workOrderTpiComponentRepo.findOne({
      where: { id },
      relations: ['component', 'workOrderTpi', 'photos'],
    });

    if (tpiMapping) {
      return {
        id: tpiMapping.id,
        work_item_id: tpiMapping.work_order_tpi_id,
        component_id: tpiMapping.component_id,
        component: tpiMapping.component
          ? {
              id: tpiMapping.component.id,
              name: tpiMapping.component.name,
              unit: tpiMapping.component.unit,
              order_number: tpiMapping.component.order_number,
              type: tpiMapping.component.type,
            }
          : {
              id: tpiMapping.component_id,
              name: tpiMapping.name || 'Component',
              unit: tpiMapping.unit || 'No.',
              order_number: tpiMapping.order_number,
              type: 'TPI',
            },
        quantity: tpiMapping.quantity,
        progress: tpiMapping.progress,
        status: tpiMapping.status,
        remarks: tpiMapping.remarks,
        approved_photo_id: tpiMapping.approved_photo_id,
        workItem: tpiMapping.workOrderTpi,
        created_at: tpiMapping.created_at,
        updated_at: tpiMapping.updated_at,
        photos: tpiMapping.photos,
      };
    }

    throw new NotFoundException(
      `Work item component mapping with ID ${id} not found`,
    );
  }

  async updateMapping(
    id: string,
    updateDto: UpdateWorkItemComponentDto,
  ): Promise<any> {
    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const svsMapping = await this.workItemComponentRepo.findOne({
      where: { id },
    });

    if (svsMapping) {
      Object.assign(svsMapping, updateDto);
      const updated = await this.workItemComponentRepo.save(svsMapping);
      if (updateDto.status) {
        await this.recalculateProgress(svsMapping.work_item_id);
      }
      return updated;
    }

    const tpiMapping = await this.workOrderTpiComponentRepo.findOne({
      where: { id },
    });

    if (tpiMapping) {
      Object.assign(tpiMapping, updateDto);
      const updated = await this.workOrderTpiComponentRepo.save(tpiMapping);
      return updated;
    }

    throw new NotFoundException(
      `Work item component mapping with ID ${id} not found`,
    );
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
    file: any,
    uploadDto: UploadComponentPhotoDto,
    employeeId: string,
  ): Promise<Photo> {
    const { componentMapping, newProgress } =
      await this.validateUploadPhotoInput(
        componentId,
        uploadDto.progress,
        employeeId,
      );

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

    await this.persistComponentProgress(componentMapping, newProgress);

    return savedPhoto;
  }

  async uploadPhotoUrl(
    componentId: string,
    uploadDto: UploadComponentPhotoUrlDto,
    employeeId: string,
  ): Promise<Photo> {
    const { componentMapping, newProgress } =
      await this.validateUploadPhotoInput(
        componentId,
        uploadDto.progress,
        employeeId,
      );

    const uploadPhotoUrlDto: UploadPhotoUrlDto = {
      photoUrl: uploadDto.photoUrl,
      latitude: uploadDto.latitude,
      longitude: uploadDto.longitude,
      timestamp: uploadDto.timestamp,
      component_id: componentId,
      work_item_id: componentMapping.work_item_id,
    };

    const savedPhoto = await this.photosService.uploadPhotoUrl(
      uploadPhotoUrlDto,
      employeeId,
    );

    await this.persistComponentProgress(componentMapping, newProgress);

    return savedPhoto;
  }

  private async validateUploadPhotoInput(
    componentId: string,
    progressInput: string,
    employeeId: string,
  ): Promise<{
    componentMapping: WorkItemComponent;
    newProgress: number;
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
    const newProgress = Number(progressInput);

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

    return { componentMapping, newProgress };
  }

  private async persistComponentProgress(
    componentMapping: WorkItemComponent,
    newProgress: number,
  ): Promise<void> {
    componentMapping.progress = newProgress;
    componentMapping.status = WorkItemComponentStatus.IN_PROGRESS;
    await this.workItemComponentRepo.save(componentMapping);
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
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const componentMapping = await this.workItemComponentRepo.findOne({
      where: { id: componentId },
      relations: ['workItem', 'workItem.agreement'],
    });

    if (componentMapping) {
      const isContractorOwner =
        user.role === UserRole.CO &&
        (componentMapping.workItem.contractor_id === userId ||
          componentMapping.workItem.agreement?.contractor_id === userId);
      const isEmployee = user.role === UserRole.EM;
      const isDo = user.role === UserRole.DO;

      if (!isContractorOwner && !isEmployee && !isDo) {
        throw new ForbiddenException(
          'Only the contractor, employees, or district officers can access component photos',
        );
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

    // Check TPI component
    const tpiComponent = await this.workOrderTpiComponentRepo.findOne({
      where: { id: componentId },
      relations: ['workOrderTpi', 'workOrderTpi.agreement'],
    });

    if (!tpiComponent) {
      throw new NotFoundException(
        `Component mapping with ID ${componentId} not found`,
      );
    }

    const [tpiPhotos, tpiTotal] = await this.workOrderTpiPhotoRepo.findAndCount({
      where: [
        { component_id: componentId },
        { work_order_tpi_id: tpiComponent.work_order_tpi_id, component_id: componentId },
      ],
      relations: ['uploader', 'selectedByUser'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tpiPhotos.map((p) => ({
        id: p.id,
        image_url: p.image_url,
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
        component_id: p.component_id,
        work_item_id: p.work_order_tpi_id,
        employee_id: p.uploader_id,
        uploader_role: p.uploader_role,
        is_selected: p.is_selected,
        selected_by: p.selected_by,
        selected_at: p.selected_at,
        created_at: p.created_at,
        employee: p.uploader,
        selectedByUser: p.selectedByUser,
      })),
      total: tpiTotal,
      page,
      limit,
      totalPages: Math.ceil(tpiTotal / limit),
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
        relations: ['workItem', 'workItem.agreement'],
      });

      if (!componentMapping) {
        const tpiComponent = await manager.findOne(WorkOrderTpiComponent, {
          where: { id: componentId },
          relations: ['workOrderTpi', 'workOrderTpi.agreement'],
        });

        if (!tpiComponent) {
          throw new NotFoundException(
            `Component mapping with ID ${componentId} not found`,
          );
        }

        const isContractorMatch =
          tpiComponent.workOrderTpi.contractor_id === contractorId ||
          tpiComponent.workOrderTpi.agreement?.contractor_id === contractorId;

        if (!isContractorMatch) {
          throw new ForbiddenException('Contractor does not own this work order');
        }

        const tpiPhoto = await manager.findOne(WorkOrderTpiPhoto, {
          where: [
            { id: photoId, component_id: componentId },
            { id: photoId, work_order_tpi_id: tpiComponent.work_order_tpi_id },
            { id: photoId },
          ],
        });

        if (!tpiPhoto) {
          throw new NotFoundException('Photo not found for the provided component');
        }

        // Deselect other photos for this component
        await manager.update(
          WorkOrderTpiPhoto,
          { component_id: componentId, work_order_tpi_id: tpiComponent.work_order_tpi_id },
          { is_selected: false, selected_by: null, selected_at: null },
        );

        // Select this photo
        await manager.update(
          WorkOrderTpiPhoto,
          { id: photoId },
          {
            is_selected: true,
            selected_by: contractorId,
            selected_at: new Date(),
          },
        );

        tpiComponent.approved_photo_id = photoId;
        tpiComponent.status = WorkItemComponentStatus.SUBMITTED;
        await manager.save(WorkOrderTpiComponent, tpiComponent);

        return;
      }

      const isContractorMatch =
        componentMapping.workItem.contractor_id === contractorId ||
        componentMapping.workItem.agreement?.contractor_id === contractorId;

      if (!isContractorMatch) {
        throw new ForbiddenException('Contractor does not own this work item');
      }

      if (
        ![
          WorkItemComponentStatus.PENDING,
          WorkItemComponentStatus.IN_PROGRESS,
          WorkItemComponentStatus.REJECTED,
          WorkItemComponentStatus.SUBMITTED,
        ].includes(componentMapping.status)
      ) {
        throw new BadRequestException(
          'Only pending, in-progress, or rejected components can be submitted',
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
        const tpiComponent = await manager.findOne(WorkOrderTpiComponent, {
          where: { id: componentId },
          relations: ['workOrderTpi'],
        });

        if (!tpiComponent) {
          throw new NotFoundException(
            `Component mapping with ID ${componentId} not found`,
          );
        }

        if (
          districtOfficer.district_id &&
          tpiComponent.workOrderTpi.district_id &&
          String(districtOfficer.district_id) !== String(tpiComponent.workOrderTpi.district_id)
        ) {
          throw new ForbiddenException(
            'District officer does not belong to this work item district',
          );
        }

        let photoId = tpiComponent.approved_photo_id;
        if (!photoId) {
          const latestPhoto = await manager.findOne(WorkOrderTpiPhoto, {
            where: { component_id: componentId },
            order: { created_at: 'DESC' },
          });
          if (latestPhoto) {
            photoId = latestPhoto.id;
            latestPhoto.is_selected = true;
            await manager.save(WorkOrderTpiPhoto, latestPhoto);
          }
        }

        tpiComponent.approved_photo_id = photoId;
        tpiComponent.approved_at = new Date();
        tpiComponent.status = WorkItemComponentStatus.APPROVED;
        tpiComponent.progress = 100;
        await manager.save(WorkOrderTpiComponent, tpiComponent);

        const allComps = await manager.find(WorkOrderTpiComponent, {
          where: { work_order_tpi_id: tpiComponent.work_order_tpi_id },
        });
        const approvedCount = allComps.filter(
          (c) => c.status === WorkItemComponentStatus.APPROVED,
        ).length;
        const progressPercentage = Math.round(
          (approvedCount / allComps.length) * 100,
        );

        await manager.update(
          WorkOrderTpi,
          { id: tpiComponent.work_order_tpi_id },
          {
            progress_percentage: progressPercentage,
            status:
              progressPercentage === 100
                ? WorkItemStatus.COMPLETED
                : WorkItemStatus.IN_PROGRESS,
          },
        );

        return;
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

      componentMapping.approved_at = new Date();
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
        const tpiComponent = await manager.findOne(WorkOrderTpiComponent, {
          where: { id: componentId },
          relations: ['workOrderTpi'],
        });

        if (!tpiComponent) {
          throw new NotFoundException(
            `Component mapping with ID ${componentId} not found`,
          );
        }

        if (
          districtOfficer.district_id &&
          tpiComponent.workOrderTpi.district_id &&
          String(districtOfficer.district_id) !== String(tpiComponent.workOrderTpi.district_id)
        ) {
          throw new ForbiddenException(
            'District officer does not belong to this work item district',
          );
        }

        if (tpiComponent.approved_photo_id) {
          await manager.update(
            WorkOrderTpiPhoto,
            { id: tpiComponent.approved_photo_id },
            { is_selected: false },
          );
        }

        tpiComponent.status = WorkItemComponentStatus.REJECTED;
        tpiComponent.approved_at = null;
        await manager.save(WorkOrderTpiComponent, tpiComponent);
        return;
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
    data: any[];
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

    const svsQuery = this.workItemComponentRepo
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.component', 'master_component')
      .leftJoinAndSelect('component.workItem', 'work_item')
      .where('component.status = :status', {
        status: WorkItemComponentStatus.SUBMITTED,
      })
      .andWhere('work_item.district_id = :districtId', {
        districtId: districtOfficer.district_id,
      })
      .orderBy('component.updated_at', 'DESC');

    const svsData = await svsQuery.getMany();

    const tpiQuery = this.workOrderTpiComponentRepo
      .createQueryBuilder('component')
      .leftJoinAndSelect('component.workOrderTpi', 'work_order_tpi')
      .where('component.status = :status', {
        status: WorkItemComponentStatus.SUBMITTED,
      })
      .andWhere('work_order_tpi.district_id = :districtId', {
        districtId: districtOfficer.district_id,
      })
      .orderBy('component.updated_at', 'DESC');

    let tpiData: any[] = [];
    try {
      tpiData = await tpiQuery.getMany();
    } catch {
      tpiData = [];
    }

    const allData = [...svsData, ...tpiData].sort((a: any, b: any) => {
      const timeA = new Date(a.updated_at || 0).getTime();
      const timeB = new Date(b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    const paginatedData = allData.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      total: allData.length,
      page,
      limit,
      totalPages: Math.ceil(allData.length / limit),
    };
  }

  async getApprovedComponents(
    page: number,
    limit: number,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [svsData, svsTotal] = await this.workItemComponentRepo.findAndCount({
      where: { status: WorkItemComponentStatus.APPROVED },
      relations: ['component', 'workItem'],
      order: { updated_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: svsData,
      total: svsTotal,
      page,
      limit,
      totalPages: Math.ceil(svsTotal / limit),
    };
  }
}
