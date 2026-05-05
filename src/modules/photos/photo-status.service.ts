import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
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
    @InjectRepository(Component)
    private componentRepository: Repository<Component>,
    @InjectRepository(WorkItemComponent)
    private workItemComponentRepository: Repository<WorkItemComponent>,
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
      throw new NotFoundException(
        `Photo status record for photo ${photoId} not found`,
      );
    }

    // Verify contractor owns the work item
    const workItem = await this.workItemRepository.findOne({
      where: { id: photoStatus.work_item_id },
    });
    console.log(workItem, contractorId);
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
        component: true,
        workItem: true,
        selectedByUser: true,
        approvedByUser: true,
        rejectedByUser: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
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
      relations: ['photo', 'component', 'workItem', 'selectedByUser'],
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
        'component',
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
      relations: ['photo', 'component', 'workItem', 'selectedByUser'],
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
      relations: [
        'photo',
        'component',
        'workItem',
        'selectedByUser',
        'approvedByUser',
      ],
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
        'component',
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
