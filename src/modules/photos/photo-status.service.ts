import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkOrderTpiComponent } from '../work-order-tpi/entities/work-order-tpi-component.entity';
import { WorkOrderTpiPhoto } from '../work-order-tpi/entities/work-order-tpi-photo.entity';
import { WorkOrderTpi, WorkItemStatus } from '../work-order-tpi/entities/work-order-tpi.entity';
import { PhotoStatus, PhotoStatusEnum } from './entities/photo-status.entity';
import { Photo } from './entities/photo.entity';

@Injectable()
export class PhotoStatusService {
  constructor(
    @InjectRepository(PhotoStatus)
    private photoStatusRepository: Repository<PhotoStatus>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(WorkItem)
    private workItemRepository: Repository<WorkItem>,
    @InjectRepository(WorkItemComponent)
    private workItemComponentRepository: Repository<WorkItemComponent>,
    @InjectRepository(WorkOrderTpiPhoto)
    private workOrderTpiPhotoRepository: Repository<WorkOrderTpiPhoto>,
    @InjectRepository(WorkOrderTpiComponent)
    private workOrderTpiComponentRepository: Repository<WorkOrderTpiComponent>,
    @InjectRepository(WorkOrderTpi)
    private workOrderTpiRepository: Repository<WorkOrderTpi>,
  ) {}

  /**
   * Automatically create a photo status record when a photo is uploaded by EM
   */
  async recordPhotoUpload(
    photoId: string,
    workItemId: string,
    componentId: string,
  ): Promise<PhotoStatus> {
    // Verify photo exists
    const photo = await this.photoRepository.findOne({
      where: { id: photoId },
    });
    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found`);
    }

    // Check if a status record already exists for this photo
    const existingStatus = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
    });

    if (existingStatus) {
      return existingStatus;
    }

    // Create new photo status record
    const photoStatus = this.photoStatusRepository.create({
      photo_id: photoId,
      work_item_id: workItemId,
      component_id: componentId,
      status: PhotoStatusEnum.UPLOADED,
    });

    return await this.photoStatusRepository.save(photoStatus);
  }

  /**
   * CO selects a photo (can select multiple photos per component)
   */
  async selectPhoto(
    photoId: string,
    contractorId: string,
  ): Promise<PhotoStatus> {
    const photoStatus = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
      relations: ['photo'],
    });

    if (!photoStatus) {
      const tpiPhoto = await this.workOrderTpiPhotoRepository.findOne({
        where: { id: photoId },
      });
      if (tpiPhoto) {
        tpiPhoto.is_selected = true;
        tpiPhoto.selected_by = contractorId;
        tpiPhoto.selected_at = new Date();
        await this.workOrderTpiPhotoRepository.save(tpiPhoto);

        const tpiComponent = await this.workOrderTpiComponentRepository.findOne({
          where: { id: tpiPhoto.component_id },
        });
        if (
          tpiComponent &&
          tpiComponent.status !== WorkItemComponentStatus.APPROVED &&
          tpiComponent.status !== WorkItemComponentStatus.SUBMITTED
        ) {
          tpiComponent.status = WorkItemComponentStatus.SUBMITTED;
          await this.workOrderTpiComponentRepository.save(tpiComponent);
        }

        return {
          id: tpiPhoto.id,
          photo_id: tpiPhoto.id,
          work_item_id: tpiPhoto.work_order_tpi_id,
          component_id: tpiPhoto.component_id,
          status: PhotoStatusEnum.SELECTED,
          selected_by: contractorId,
          selected_at: new Date(),
        } as any;
      }

      throw new NotFoundException(
        `Photo status record for photo ${photoId} not found`,
      );
    }

    // Verify contractor owns the work item
    const workItem = await this.workItemRepository.findOne({
      where: { id: photoStatus.work_item_id },
    });
    if (!workItem || workItem.contractor_id !== contractorId) {
      throw new BadRequestException(
        'You can only select photos for your own work items',
      );
    }

    // Mark photo as SELECTED
    photoStatus.status = PhotoStatusEnum.SELECTED;
    photoStatus.selected_by = contractorId;
    photoStatus.selected_at = new Date();
    photoStatus.rejected_by = null;
    photoStatus.rejected_at = null;

    const saved = await this.photoStatusRepository.save(photoStatus);

    // Update WorkItemComponent status to SUBMITTED when at least one photo is selected
    const mapping = await this.workItemComponentRepository.findOne({
      where: { id: photoStatus.component_id },
    });

    if (
      mapping &&
      mapping.status !== WorkItemComponentStatus.APPROVED &&
      mapping.status !== WorkItemComponentStatus.SUBMITTED
    ) {
      mapping.status = WorkItemComponentStatus.SUBMITTED;
      await this.workItemComponentRepository.save(mapping);
    }

    return saved;
  }

  /**
   * CO deselects a previously selected photo
   */
  async deselectPhoto(
    photoId: string,
    contractorId: string,
  ): Promise<PhotoStatus> {
    const photoStatus = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
    });

    if (!photoStatus) {
      const tpiPhoto = await this.workOrderTpiPhotoRepository.findOne({
        where: { id: photoId },
      });
      if (tpiPhoto) {
        tpiPhoto.is_selected = false;
        tpiPhoto.selected_by = null;
        tpiPhoto.selected_at = null;
        await this.workOrderTpiPhotoRepository.save(tpiPhoto);

        const remainingSelected = await this.workOrderTpiPhotoRepository.count({
          where: {
            component_id: tpiPhoto.component_id,
            is_selected: true,
          },
        });

        if (remainingSelected === 0) {
          const tpiComponent = await this.workOrderTpiComponentRepository.findOne({
            where: { id: tpiPhoto.component_id },
          });
          if (
            tpiComponent &&
            tpiComponent.status !== WorkItemComponentStatus.APPROVED &&
            tpiComponent.status !== WorkItemComponentStatus.REJECTED
          ) {
            tpiComponent.status = WorkItemComponentStatus.IN_PROGRESS;
            await this.workOrderTpiComponentRepository.save(tpiComponent);
          }
        }

        return {
          id: tpiPhoto.id,
          photo_id: tpiPhoto.id,
          work_item_id: tpiPhoto.work_order_tpi_id,
          component_id: tpiPhoto.component_id,
          status: PhotoStatusEnum.UPLOADED,
        } as any;
      }

      throw new NotFoundException(
        `Photo status record for photo ${photoId} not found`,
      );
    }

    if (photoStatus.selected_by !== contractorId) {
      throw new BadRequestException(
        'Only the contractor who selected this photo can deselect it',
      );
    }

    // If photo was approved, cannot deselect
    if (photoStatus.status === PhotoStatusEnum.APPROVED) {
      throw new BadRequestException('Cannot deselect an approved photo');
    }

    // Revert to UPLOADED status
    photoStatus.status = PhotoStatusEnum.UPLOADED;
    photoStatus.selected_by = null;
    photoStatus.selected_at = null;

    const saved = await this.photoStatusRepository.save(photoStatus);

    // If there are no more selected photos for this component, revert mapping to IN_PROGRESS
    const remainingSelected = await this.photoStatusRepository.count({
      where: {
        component_id: photoStatus.component_id,
        status: PhotoStatusEnum.SELECTED,
      },
    });

    if (remainingSelected === 0) {
      const mapping = await this.workItemComponentRepository.findOne({
        where: { id: photoStatus.component_id },
      });

      if (
        mapping &&
        mapping.status !== WorkItemComponentStatus.APPROVED &&
        mapping.status !== WorkItemComponentStatus.REJECTED
      ) {
        mapping.status = WorkItemComponentStatus.IN_PROGRESS;
        await this.workItemComponentRepository.save(mapping);
      }
    }

    return saved;
  }

  /**
   * DO approves a photo
   */
  async approvePhoto(photoId: string, doUserId: string): Promise<PhotoStatus> {
    const photoStatus = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
      relations: ['photo'],
    });

    if (!photoStatus) {
      const tpiPhoto = await this.workOrderTpiPhotoRepository.findOne({
        where: { id: photoId },
      });
      if (tpiPhoto) {
        tpiPhoto.is_selected = true;
        await this.workOrderTpiPhotoRepository.save(tpiPhoto);

        const tpiComponent = await this.workOrderTpiComponentRepository.findOne({
          where: { id: tpiPhoto.component_id },
        });

        if (tpiComponent) {
          tpiComponent.status = WorkItemComponentStatus.APPROVED;
          tpiComponent.approved_at = new Date();
          tpiComponent.progress = 100;
          tpiComponent.approved_photo_id = tpiPhoto.id;
          await this.workOrderTpiComponentRepository.save(tpiComponent);

          const allComps = await this.workOrderTpiComponentRepository.find({
            where: { work_order_tpi_id: tpiComponent.work_order_tpi_id },
          });
          const approvedCount = allComps.filter(
            (c) => c.status === WorkItemComponentStatus.APPROVED,
          ).length;
          const progressPercentage = Math.round(
            (approvedCount / allComps.length) * 100,
          );

          await this.workOrderTpiRepository.update(
            { id: tpiComponent.work_order_tpi_id },
            {
              progress_percentage: progressPercentage,
              status:
                approvedCount === allComps.length
                  ? WorkItemStatus.COMPLETED
                  : WorkItemStatus.IN_PROGRESS,
            },
          );
        }

        return {
          id: tpiPhoto.id,
          photo_id: tpiPhoto.id,
          work_item_id: tpiPhoto.work_order_tpi_id,
          component_id: tpiPhoto.component_id,
          status: PhotoStatusEnum.APPROVED,
          approved_by: doUserId,
          approved_at: new Date(),
        } as any;
      }

      throw new NotFoundException(
        `Photo status record for photo ${photoId} not found`,
      );
    }

    // Only SELECTED or REJECTED photos can be approved
    if (
      photoStatus.status !== PhotoStatusEnum.SELECTED &&
      photoStatus.status !== PhotoStatusEnum.REJECTED
    ) {
      throw new BadRequestException(
        'Only SELECTED or REJECTED photos can be approved. Photo must first be selected by CO.',
      );
    }
    // Mark photo as APPROVED
    photoStatus.status = PhotoStatusEnum.APPROVED;
    photoStatus.approved_by = doUserId;
    photoStatus.approved_at = new Date();
    photoStatus.rejected_by = null;
    photoStatus.rejected_at = null;

    const saved = await this.photoStatusRepository.save(photoStatus);

    const mapping = await this.workItemComponentRepository.findOne({
      where: { id: photoStatus.component_id },
    });

    if (mapping) {
      mapping.status = WorkItemComponentStatus.APPROVED;
      await this.workItemComponentRepository.save(mapping);
    }

    return saved;
  }

  /**
   * DO rejects a selected photo
   */
  async rejectPhoto(photoId: string, doUserId: string): Promise<PhotoStatus> {
    const photoStatus = await this.photoStatusRepository.findOne({
      where: { photo_id: photoId },
      relations: ['photo'],
    });

    if (!photoStatus) {
      const tpiPhoto = await this.workOrderTpiPhotoRepository.findOne({
        where: { id: photoId },
      });
      if (tpiPhoto) {
        tpiPhoto.is_selected = false;
        await this.workOrderTpiPhotoRepository.save(tpiPhoto);

        const tpiComponent = await this.workOrderTpiComponentRepository.findOne({
          where: { id: tpiPhoto.component_id },
        });

        if (tpiComponent) {
          tpiComponent.status = WorkItemComponentStatus.REJECTED;
          await this.workOrderTpiComponentRepository.save(tpiComponent);
        }

        return {
          id: tpiPhoto.id,
          photo_id: tpiPhoto.id,
          work_item_id: tpiPhoto.work_order_tpi_id,
          component_id: tpiPhoto.component_id,
          status: PhotoStatusEnum.REJECTED,
          rejected_by: doUserId,
          rejected_at: new Date(),
        } as any;
      }

      throw new NotFoundException(
        `Photo status record for photo ${photoId} not found`,
      );
    }

    if (
      photoStatus.status !== PhotoStatusEnum.SELECTED &&
      photoStatus.status !== PhotoStatusEnum.REJECTED
    ) {
      throw new BadRequestException(
        'Only SELECTED or REJECTED photos can be rejected. Photo must first be selected by CO.',
      );
    }

    // Mark photo as REJECTED
    photoStatus.status = PhotoStatusEnum.REJECTED;
    photoStatus.rejected_by = doUserId;
    photoStatus.rejected_at = new Date();
    photoStatus.approved_by = null;
    photoStatus.approved_at = null;

    return await this.photoStatusRepository.save(photoStatus);
  }

  /**
   * Get all photos for a component with pagination
   */
  async getPhotosByComponent(
    componentId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PhotoStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoStatusRepository.findAndCount({
      where: { component_id: componentId },
      relations: {
        photo: {
          employee: true,
        },
        workItemComponent: true,
        workItem: true,
        selectedByUser: true,
        approvedByUser: {
          district: true,
        },
        rejectedByUser: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    if (total > 0) {
      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Check TPI photos
    const [tpiPhotos, tpiTotal] = await this.workOrderTpiPhotoRepository.findAndCount({
      where: { component_id: componentId },
      relations: ['uploader', 'selectedByUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const mappedItems: any[] = tpiPhotos.map((p) => ({
      id: p.id,
      photo_id: p.id,
      work_item_id: p.work_order_tpi_id,
      component_id: p.component_id,
      status: p.is_selected
        ? PhotoStatusEnum.SELECTED
        : (p.uploader_role === UserRole.TPI ? PhotoStatusEnum.SELECTED : PhotoStatusEnum.UPLOADED),
      uploader_role: p.uploader_role,
      is_tpi: p.uploader_role === UserRole.TPI,
      photo: {
        id: p.id,
        image_url: p.image_url,
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
        employee: {
          id: p.uploader?.id,
          name: p.uploader?.name,
          code: p.uploader?.code,
          role: p.uploader_role,
        },
      },
      selectedByUser: p.selectedByUser,
      selected_at: p.selected_at,
      created_at: p.created_at,
    }));

    return {
      data: mappedItems,
      total: tpiTotal,
      page,
      limit,
      totalPages: Math.ceil(tpiTotal / limit),
    };
  }

  /**
   * Get all selected photos for a work item (selected by CO)
   */
  async getSelectedPhotosByWorkItem(
    workItemId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PhotoStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoStatusRepository.findAndCount({
      where: {
        work_item_id: workItemId,
        status: PhotoStatusEnum.SELECTED,
      },
      relations: ['photo', 'workItemComponent', 'workItem', 'selectedByUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { selected_at: 'DESC' },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all approved photos for a work item (approved by DO)
   */
  async getApprovedPhotosByWorkItem(
    workItemId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PhotoStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoStatusRepository.findAndCount({
      where: {
        work_item_id: workItemId,
        status: PhotoStatusEnum.APPROVED,
      },
      relations: [
        'photo',
        'workItemComponent',
        'workItem',
        'selectedByUser',
        'approvedByUser',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { approved_at: 'DESC' },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all selected photos by a specific CO for a component
   */
  async getSelectedPhotosByContractor(
    componentId: string,
    contractorId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PhotoStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoStatusRepository.findAndCount({
      where: {
        component_id: componentId,
        status: PhotoStatusEnum.SELECTED,
        selected_by: contractorId,
      },
      relations: ['photo', 'workItemComponent', 'workItem', 'selectedByUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { selected_at: 'DESC' },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Check if a component has at least one selected photo
   */
  async hasSelectedPhotos(componentId: string): Promise<boolean> {
    const count = await this.photoStatusRepository.count({
      where: {
        component_id: componentId,
        status: PhotoStatusEnum.SELECTED,
      },
    });
    return count > 0;
  }

  /**
   * Check if a component has at least one approved photo
   */
  async hasApprovedPhotos(componentId: string): Promise<boolean> {
    const count = await this.photoStatusRepository.count({
      where: {
        component_id: componentId,
        status: PhotoStatusEnum.APPROVED,
      },
    });
    return count > 0;
  }

  /**
   * Get a single photo status record
   */
  async findOne(photoStatusId: string): Promise<PhotoStatus> {
    const photoStatus = await this.photoStatusRepository.findOne({
      where: { id: photoStatusId },
      relations: {
        photo: {
          employee: true,
        },
        workItemComponent: {
          component: true,
        },
        workItem: {
          district: true,
        },
        selectedByUser: true,
        approvedByUser: true,
      },
    });

    if (!photoStatus) {
      throw new NotFoundException(
        `Photo status with ID ${photoStatusId} not found`,
      );
    }

    return photoStatus;
  }

  /**
   * Get all approved photos (for HO to view all approvals)
   */
  async getAllApprovedPhotos(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PhotoStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoStatusRepository.findAndCount({
      where: { status: PhotoStatusEnum.APPROVED },
      relations: [
        'photo',
        'workItemComponent',
        'workItem',
        'selectedByUser',
        'approvedByUser',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { approved_at: 'DESC' },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
