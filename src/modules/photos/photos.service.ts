import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { Photo } from './entities/photo.entity';

@Injectable()
export class PhotosService {
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(Photo)
    private photoRepo: Repository<Photo>,
    private configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'ap-south-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  async uploadPhoto(
    file: Express.Multer.File,
    uploadPhotoDto: UploadPhotoDto,
    employeeId: string,
  ): Promise<Photo> {
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET', '');
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');

    if (!bucketName) {
      throw new InternalServerErrorException('AWS_S3_BUCKET is not configured');
    }

    const sanitizedName = file.originalname.replace(/\s+/g, '-');
    const objectKey = `work-items/${uploadPhotoDto.work_item_id}/components/${uploadPhotoDto.component_id}/${Date.now()}-${sanitizedName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;

    const photo = this.photoRepo.create({
      image_url: imageUrl,
      latitude: uploadPhotoDto.latitude,
      longitude: uploadPhotoDto.longitude,
      timestamp: uploadPhotoDto.timestamp,
      employee_id: employeeId,
      component_id: uploadPhotoDto.component_id,
      work_item_id: uploadPhotoDto.work_item_id,
    });

    return await this.photoRepo.save(photo);
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
      where: { component_id: componentId },
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
}
