import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { UploadService } from '../../common/upload/upload.service';
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

  const uploadService = {
    uploadObject: jest.fn(),
  } as unknown as UploadService;

  beforeEach(() => {
    service = new PhotosService(photoRepo, uploadService);
    jest.clearAllMocks();
  });

  it('findOne throws when photo not found', async () => {
    (photoRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('uploadPhoto bubbles upload provider failures', async () => {
    (uploadService.uploadObject as jest.Mock).mockRejectedValue(
      new InternalServerErrorException('Storage provider unavailable'),
    );

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

  it('uploadPhoto stores the provider returned url', async () => {
    (uploadService.uploadObject as jest.Mock).mockResolvedValue({
      objectKey: 'work-items/w1/components/c1/key.jpg',
      url: 'https://example-storage.com/key.jpg',
      provider: 'aws-s3',
    });
    (photoRepo.create as jest.Mock).mockImplementation((payload) => payload);
    (photoRepo.save as jest.Mock).mockImplementation(async (photo) => ({
      id: 'p1',
      ...photo,
    }));

    const result = await service.uploadPhoto(
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
    );

    expect(uploadService.uploadObject).toHaveBeenCalled();
    expect(photoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'https://example-storage.com/key.jpg',
        component_id: 'c1',
        work_item_id: 'w1',
      }),
    );
    expect(result.image_url).toBe('https://example-storage.com/key.jpg');
  });
});
