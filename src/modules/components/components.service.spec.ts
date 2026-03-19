import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Photo } from '../photos/entities/photo.entity';
import { PhotosService } from '../photos/photos.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ComponentsService } from './components.service';
import { Component } from './entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from './entities/work-item-component.entity';

describe('ComponentsService', () => {
  let service: ComponentsService;

  const componentRepo = {
    find: jest.fn(),
  } as unknown as Repository<Component>;

  const workItemComponentRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    manager: {
      count: jest.fn(),
      update: jest.fn(),
    },
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<WorkItemComponent>;

  const workItemRepo = {} as Repository<WorkItem>;
  const photoRepo = {
    findAndCount: jest.fn(),
  } as unknown as Repository<Photo>;

  const userRepo = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;

  const photosService = {
    uploadPhoto: jest.fn(),
  } as unknown as PhotosService;

  const dataSource = {
    transaction: jest.fn(),
  } as unknown as DataSource;

  beforeEach(() => {
    service = new ComponentsService(
      componentRepo,
      workItemComponentRepo,
      workItemRepo,
      photoRepo,
      userRepo,
      photosService,
      dataSource,
    );
    jest.clearAllMocks();
  });

  it('findMasterComponents delegates to repository', async () => {
    (componentRepo.find as jest.Mock).mockResolvedValue([{ id: 'c1' }]);

    const result = await service.findMasterComponents();

    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('uploadPhoto throws when component mapping not found', async () => {
    (workItemComponentRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.uploadPhoto(
        'missing',
        {
          originalname: 'a.jpg',
        } as unknown as Express.Multer.File,
        {
          progress: '1',
          latitude: 1,
          longitude: 1,
          timestamp: new Date(),
        },
        'em1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('uploadPhoto validates progress > 0', async () => {
    const mapping = {
      id: 'wc1',
      status: WorkItemComponentStatus.PENDING,
      quantity: 10,
      progress: 0,
      work_item_id: 'w1',
    };
    (workItemComponentRepo.findOne as jest.Mock).mockResolvedValue(mapping);
    (workItemComponentRepo.find as jest.Mock).mockResolvedValue([
      {
        ...mapping,
        component: { order_number: 1 },
      },
    ]);
    (userRepo.findOne as jest.Mock).mockResolvedValue({ role: UserRole.EM });

    await expect(
      service.uploadPhoto(
        'wc1',
        {
          originalname: 'a.jpg',
        } as unknown as Express.Multer.File,
        {
          progress: '0',
          latitude: 1,
          longitude: 1,
          timestamp: new Date(),
        },
        'em1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uploadPhoto blocks progress when previous component is not approved', async () => {
    const mapping = {
      id: 'wc2',
      status: WorkItemComponentStatus.PENDING,
      quantity: 10,
      progress: 0,
      work_item_id: 'w1',
    };

    (workItemComponentRepo.findOne as jest.Mock).mockResolvedValue(mapping);
    (workItemComponentRepo.find as jest.Mock).mockResolvedValue([
      {
        id: 'wc1',
        status: WorkItemComponentStatus.PENDING,
        component: { order_number: 1 },
      },
      {
        ...mapping,
        component: { order_number: 2 },
      },
    ]);
    (userRepo.findOne as jest.Mock).mockResolvedValue({ role: UserRole.EM });

    await expect(
      service.uploadPhoto(
        'wc2',
        {
          originalname: 'a.jpg',
        } as unknown as Express.Multer.File,
        {
          progress: '1',
          latitude: 1,
          longitude: 1,
          timestamp: new Date(),
        },
        'em1',
      ),
    ).rejects.toThrow(
      'Progress updates must follow component order. Previous components must be approved first',
    );
  });

  it('uploadPhoto blocks when another component is already in progress', async () => {
    const mapping = {
      id: 'wc2',
      status: WorkItemComponentStatus.PENDING,
      quantity: 10,
      progress: 0,
      work_item_id: 'w1',
    };

    (workItemComponentRepo.findOne as jest.Mock).mockResolvedValue(mapping);
    (workItemComponentRepo.find as jest.Mock).mockResolvedValue([
      {
        id: 'wc1',
        status: WorkItemComponentStatus.APPROVED,
        component: { order_number: 1 },
      },
      {
        id: 'wc-other',
        status: WorkItemComponentStatus.IN_PROGRESS,
        component: { order_number: 3 },
      },
      {
        ...mapping,
        component: { order_number: 2 },
      },
    ]);
    (userRepo.findOne as jest.Mock).mockResolvedValue({ role: UserRole.EM });

    await expect(
      service.uploadPhoto(
        'wc2',
        {
          originalname: 'a.jpg',
        } as unknown as Express.Multer.File,
        {
          progress: '1',
          latitude: 1,
          longitude: 1,
          timestamp: new Date(),
        },
        'em1',
      ),
    ).rejects.toThrow(
      'Only one component can be in progress at a time for a work item',
    );
  });
});
