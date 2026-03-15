import { S3Client } from '@aws-sdk/client-s3';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Photo } from './entities/photo.entity';
import { PhotosService } from './photos.service';

describe('PhotosService', () => {
  let service: PhotosService;

  const photoRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  } as unknown as Repository<Photo>;

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const map: Record<string, string> = {
        AWS_REGION: 'ap-south-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_S3_BUCKET: 'bucket',
      };
      return map[key] ?? fallback;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    service = new PhotosService(photoRepo, configService);
    jest.clearAllMocks();
  });

  it('findOne throws when photo not found', async () => {
    (photoRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('uploadPhoto throws when bucket is missing', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'AWS_S3_BUCKET') return '';
      if (key === 'AWS_REGION') return 'ap-south-1';
      return 'x';
    });

    await expect(
      service.uploadPhoto(
        {
          originalname: 'a.jpg',
          buffer: Buffer.from('a'),
          mimetype: 'image/jpeg',
        } as unknown as Express.Multer.File,
        {
          latitude: 1,
          longitude: 1,
          timestamp: new Date(),
          component_id: 'c1',
          work_item_id: 'w1',
        },
        'em1',
      ),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
