import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UploadService } from '../../common/upload/upload.service';
import { UploadPhotoUrlDto } from './dto/upload-photo-url.dto';
import { UploadTpiReferencePhotoUrlDto } from './dto/upload-tpi-reference-photo-url.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { Photo, PhotoSource } from './entities/photo.entity';
import { PhotoStatusService } from './photo-status.service';
import { TpiReferencePhotoStatus, TpiReferencePhotoStatusEnum } from './entities/tpi-reference-photo-status.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem, WorkOrderType } from '../work-items/entities/work-item.entity';
import { WorkItemComponent, WorkItemComponentStatus } from '../components/entities/work-item-component.entity';
import { TpiStaffRelationship } from '../users/entities/tpi-staff-relationship.entity';
import { WorkItemTpiStaffAssignment } from '../work-items/entities/work-item-tpi-staff-assignment.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private photoRepo: Repository<Photo>,
    private readonly uploadService: UploadService,
    private readonly photoStatusService: PhotoStatusService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadPhoto(
    file: any,
    uploadPhotoDto: UploadPhotoDto,
    employeeId: string,
  ): Promise<Photo> {
    try {
      const sanitizedName = file.originalname.replace(/\s+/g, '-');
      const objectKey = `work-items/${uploadPhotoDto.work_item_id}/components/${uploadPhotoDto.component_id}/${Date.now()}-${sanitizedName}`;

      const uploadResult = await this.uploadService.uploadObject({
        objectKey,
        body: file.buffer,
        contentType: file.mimetype,
      });

      return await this.persistPhoto(
        uploadResult.url,
        uploadPhotoDto,
        employeeId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to upload photo');
    }
  }

  async uploadPhotoUrl(
    uploadPhotoUrlDto: UploadPhotoUrlDto,
    employeeId: string,
  ): Promise<Photo> {
    const photoUrl = uploadPhotoUrlDto.photoUrl?.trim();
    if (!photoUrl) {
      throw new BadRequestException('photoUrl is required');
    }

    try {
      return await this.persistPhoto(photoUrl, uploadPhotoUrlDto, employeeId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to store photo metadata');
    }
  }

  private async persistPhoto(
    imageUrl: string,
    uploadPhotoDto: UploadPhotoDto,
    employeeId: string,
  ): Promise<Photo> {
    const photo = this.photoRepo.create({
      image_url: imageUrl,
      latitude: uploadPhotoDto.latitude,
      longitude: uploadPhotoDto.longitude,
      timestamp: uploadPhotoDto.timestamp,
      employee_id: employeeId,
      component_id: uploadPhotoDto.component_id,
      work_item_id: uploadPhotoDto.work_item_id,
    });

    const savedPhoto = await this.photoRepo.save(photo);

    // Auto-create photo status record
    await this.photoStatusService.recordPhotoUpload(
      savedPhoto.id,
      savedPhoto.work_item_id,
      savedPhoto.component_id,
    );

    return savedPhoto;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Photo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoRepo.findAndCount({
      where: { source: PhotoSource.CONTRACTOR },
      skip: (page - 1) * limit,
      take: limit,
      relations: [
        'employee',
        'workItemComponent',
        'workItem',
        'selectedByUser',
      ],
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

  async reviewByComponent(
    componentId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Photo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [items, total] = await this.photoRepo.findAndCount({
      where: { component_id: componentId, source: PhotoSource.CONTRACTOR },
      skip: (page - 1) * limit,
      take: limit,
      relations: [
        'employee',
        'workItemComponent',
        'workItem',
        'selectedByUser',
      ],
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

  async selectBestPhoto(photoId: string, contractorId: string): Promise<Photo> {
    const targetPhoto = await this.findOne(photoId);

    if (targetPhoto.source !== PhotoSource.CONTRACTOR) {
      throw new BadRequestException('Only contractor progress photos can be selected');
    }

    await this.photoRepo.update(
      { component_id: targetPhoto.component_id },
      {
        is_selected: false,
        selected_by: null,
        selected_at: null,
        is_forwarded_to_do: false,
        forwarded_at: null,
      },
    );

    targetPhoto.is_selected = true;
    targetPhoto.selected_by = contractorId;
    targetPhoto.selected_at = new Date();
    targetPhoto.is_forwarded_to_do = false;
    targetPhoto.forwarded_at = null;

    return await this.photoRepo.save(targetPhoto);
  }

  async forwardSelectedPhoto(
    photoId: string,
    contractorId: string,
  ): Promise<Photo> {
    const photo = await this.findOne(photoId);

    if (photo.source !== PhotoSource.CONTRACTOR) {
      throw new BadRequestException('Only contractor progress photos can be forwarded');
    }

    if (!photo.is_selected) {
      throw new BadRequestException(
        'Only selected photo can be forwarded to DO',
      );
    }

    if (photo.selected_by !== contractorId) {
      throw new BadRequestException(
        'Only the contractor who selected this photo can forward it',
      );
    }

    if (photo.is_forwarded_to_do) {
      throw new BadRequestException('Photo already forwarded to DO');
    }

    photo.is_forwarded_to_do = true;
    photo.forwarded_at = new Date();

    return await this.photoRepo.save(photo);
  }

  async findOne(id: string): Promise<Photo> {
    const photo = await this.photoRepo.findOne({
      where: { id },
      relations: [
        'employee',
        'workItemComponent',
        'workItem',
        'selectedByUser',
      ],
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    return photo;
  }

  async uploadTpiReferencePhotoUrl(
    dto: UploadTpiReferencePhotoUrlDto,
    staffId: string,
  ): Promise<Photo> {
    return await this.dataSource.transaction(async (manager) => {
      const staffUser = await manager.findOne(User, { where: { id: staffId, role: UserRole.TPI_STAFF } });
      if (!staffUser) {
        throw new ForbiddenException('Only TPI staff members can upload reference photos');
      }

      const relationship = await manager.findOne(TpiStaffRelationship, {
        where: { staff_id: staffId },
      });
      if (!relationship) {
        throw new ForbiddenException('TPI staff member has no parent TPI agency');
      }

      const parentTpi = await manager.findOne(User, {
        where: { id: relationship.tpi_id, role: UserRole.TPI },
      });
      if (!parentTpi || !parentTpi.is_active) {
        throw new ForbiddenException('Parent TPI agency is inactive or does not exist');
      }

      const mapping = await manager.findOne(WorkItemComponent, {
        where: { id: dto.component_id },
        relations: ['workItem'],
      });
      if (!mapping) {
        throw new NotFoundException('Work item component mapping not found');
      }

      const workItem = mapping.workItem;
      if (workItem.work_order_type !== WorkOrderType.BULK_VILLAGE) {
        throw new BadRequestException('TPI reference uploads are only supported for Bulk Village work items');
      }

      const assignment = await manager.findOne(WorkItemTpiStaffAssignment, {
        where: { work_item_id: workItem.id, staff_id: staffId },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this work item');
      }

      const currentSelected = await manager.findOne(TpiReferencePhotoStatus, {
        where: {
          work_item_id: workItem.id,
          component_id: mapping.component_id,
          status: TpiReferencePhotoStatusEnum.SELECTED,
        },
      });
      if (currentSelected) {
        throw new BadRequestException('Upload blocked: TPI has already selected a reference photo for this component');
      }

      if (mapping.status === WorkItemComponentStatus.APPROVED) {
        throw new BadRequestException('Cannot upload reference photo for an already approved component');
      }

      const photo = manager.create(Photo, {
        image_url: dto.photoUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timestamp: new Date(dto.timestamp),
        employee_id: staffId,
        component_id: mapping.id,
        work_item_id: workItem.id,
        source: PhotoSource.TPI,
        is_selected: false,
      });

      const savedPhoto = await manager.save(Photo, photo);

      const refStatus = manager.create(TpiReferencePhotoStatus, {
        photo_id: savedPhoto.id,
        work_item_id: workItem.id,
        component_id: mapping.component_id,
        status: TpiReferencePhotoStatusEnum.UPLOADED,
      });
      await manager.save(TpiReferencePhotoStatus, refStatus);

      return savedPhoto;
    });
  }

  async listTpiReferencePhotos(
    componentId: string,
    userId: string,
    role: UserRole,
  ): Promise<any[]> {
    return await this.dataSource.transaction(async (manager) => {
      if (role === UserRole.HO) {
        throw new ForbiddenException('Head Office is not permitted to view TPI reference photos');
      }

      const mapping = await manager.findOne(WorkItemComponent, {
        where: { id: componentId },
        relations: ['workItem'],
      });
      if (!mapping) {
        throw new NotFoundException('Work item component mapping not found');
      }

      const workItem = mapping.workItem;

      if (role === UserRole.DO) {
        const doUser = await manager.findOne(User, { where: { id: userId, role: UserRole.DO } });
        if (!doUser || !doUser.is_executive_engineer) {
          throw new ForbiddenException('Only Executive Engineers can view TPI reference photos');
        }
        if (doUser.district_id !== workItem.district_id) {
          throw new ForbiddenException('District mismatch: You do not belong to this district');
        }
      } else if (role === UserRole.TPI) {
        if (workItem.tpi_id !== userId) {
          throw new ForbiddenException('This work item is not assigned to your TPI agency');
        }
      } else if (role === UserRole.TPI_STAFF) {
        const assignment = await manager.findOne(WorkItemTpiStaffAssignment, {
          where: { work_item_id: workItem.id, staff_id: userId },
        });
        if (!assignment) {
          throw new ForbiddenException('You are not assigned to this work item');
        }
      } else {
        throw new ForbiddenException('Insufficient permissions');
      }

      const photos = await manager
        .getRepository(Photo)
        .createQueryBuilder('photo')
        .leftJoinAndSelect(
          TpiReferencePhotoStatus,
          'status',
          'status.photo_id = photo.id'
        )
        .where('photo.component_id = :componentId', { componentId })
        .andWhere('photo.source = :source', { source: PhotoSource.TPI })
        .select([
          'photo.id AS id',
          'photo.image_url AS image_url',
          'photo.latitude AS latitude',
          'photo.longitude AS longitude',
          'photo.timestamp AS timestamp',
          'photo.employee_id AS employee_id',
          'photo.component_id AS component_id',
          'photo.work_item_id AS work_item_id',
          'photo.created_at AS created_at',
          'status.status AS status',
          'status.selected_by AS selected_by',
          'status.selected_at AS selected_at',
        ])
        .orderBy('photo.created_at', 'DESC')
        .getRawMany();

      return photos.map(p => ({
        id: p.id,
        image_url: p.image_url,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        timestamp: p.timestamp,
        employee_id: p.employee_id,
        component_id: p.component_id,
        work_item_id: p.work_item_id,
        created_at: p.created_at,
        status: p.status || TpiReferencePhotoStatusEnum.UPLOADED,
        selected_by: p.selected_by || null,
        selected_at: p.selected_at || null,
      }));
    });
  }

  async selectTpiReferencePhoto(
    photoId: string,
    tpiId: string,
  ): Promise<TpiReferencePhotoStatus> {
    return await this.dataSource.transaction(async (manager) => {
      const statusRecord = await manager.findOne(TpiReferencePhotoStatus, {
        where: { photo_id: photoId },
        relations: ['workItem', 'component'],
      });
      if (!statusRecord) {
        throw new NotFoundException('TPI reference photo status record not found');
      }

      const mapping = await manager.findOne(WorkItemComponent, {
        where: { component_id: statusRecord.component_id, work_item_id: statusRecord.work_item_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mapping) {
        throw new NotFoundException('Component mapping not found');
      }

      if (mapping.status === WorkItemComponentStatus.APPROVED) {
        throw new BadRequestException('Cannot select reference photo after DO contractor evidence approval');
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: statusRecord.work_item_id },
      });
      if (!workItem || workItem.tpi_id !== tpiId) {
        throw new ForbiddenException('This work item is not assigned to your TPI agency');
      }

      await manager.update(
        TpiReferencePhotoStatus,
        {
          work_item_id: statusRecord.work_item_id,
          component_id: statusRecord.component_id,
          status: TpiReferencePhotoStatusEnum.SELECTED,
        },
        {
          status: TpiReferencePhotoStatusEnum.UPLOADED,
          selected_by: null,
          selected_at: null,
        }
      );

      statusRecord.status = TpiReferencePhotoStatusEnum.SELECTED;
      statusRecord.selected_by = tpiId;
      statusRecord.selected_at = new Date();

      return await manager.save(TpiReferencePhotoStatus, statusRecord);
    });
  }

  async deselectTpiReferencePhoto(
    photoId: string,
    tpiId: string,
  ): Promise<TpiReferencePhotoStatus> {
    return await this.dataSource.transaction(async (manager) => {
      const statusRecord = await manager.findOne(TpiReferencePhotoStatus, {
        where: { photo_id: photoId },
        relations: ['workItem', 'component'],
      });
      if (!statusRecord) {
        throw new NotFoundException('TPI reference photo status record not found');
      }

      const mapping = await manager.findOne(WorkItemComponent, {
        where: { component_id: statusRecord.component_id, work_item_id: statusRecord.work_item_id },
      });
      if (!mapping) {
        throw new NotFoundException('Component mapping not found');
      }

      if (mapping.status === WorkItemComponentStatus.APPROVED) {
        throw new BadRequestException('Cannot deselect reference photo after DO contractor evidence approval');
      }

      const workItem = await manager.findOne(WorkItem, {
        where: { id: statusRecord.work_item_id },
      });
      if (!workItem || workItem.tpi_id !== tpiId) {
        throw new ForbiddenException('This work item is not assigned to your TPI agency');
      }

      statusRecord.status = TpiReferencePhotoStatusEnum.UPLOADED;
      statusRecord.selected_by = null;
      statusRecord.selected_at = null;

      return await manager.save(TpiReferencePhotoStatus, statusRecord);
    });
  }

  async getTpiReferencePhotoStatus(
    componentId: string,
    userId: string,
    role: UserRole,
  ): Promise<TpiReferencePhotoStatus | null> {
    return await this.dataSource.transaction(async (manager) => {
      const mapping = await manager.findOne(WorkItemComponent, {
        where: { id: componentId },
        relations: ['workItem'],
      });
      if (!mapping) {
        throw new NotFoundException('Work item component mapping not found');
      }

      const workItem = mapping.workItem;

      if (role === UserRole.DO) {
        const doUser = await manager.findOne(User, { where: { id: userId, role: UserRole.DO } });
        if (!doUser || !doUser.is_executive_engineer) {
          throw new ForbiddenException('Only Executive Engineers can view TPI status');
        }
        if (doUser.district_id !== workItem.district_id) {
          throw new ForbiddenException('District mismatch: You do not belong to this district');
        }
      } else if (role === UserRole.TPI) {
        if (workItem.tpi_id !== userId) {
          throw new ForbiddenException('This work item is not assigned to your TPI agency');
        }
      } else if (role === UserRole.TPI_STAFF) {
        const assignment = await manager.findOne(WorkItemTpiStaffAssignment, {
          where: { work_item_id: workItem.id, staff_id: userId },
        });
        if (!assignment) {
          throw new ForbiddenException('You are not assigned to this work item');
        }
      } else {
        throw new ForbiddenException('Insufficient permissions');
      }

      return await manager.findOne(TpiReferencePhotoStatus, {
        where: {
          work_item_id: workItem.id,
          component_id: mapping.component_id,
          status: TpiReferencePhotoStatusEnum.SELECTED,
        },
        relations: ['photo'],
      });
    });
  }
}
