import { Test, TestingModule } from '@nestjs/testing';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';

describe('ComponentsController', () => {
  let controller: ComponentsController;
  const componentsService = {
    findMasterComponents: jest.fn(),
    uploadPhoto: jest.fn(),
    uploadPhotoUrl: jest.fn(),
    getComponentPhotos: jest.fn(),
    selectPhoto: jest.fn(),
    approveComponent: jest.fn(),
    rejectComponent: jest.fn(),
    getPendingApproval: jest.fn(),
    getApprovedComponents: jest.fn(),
    findByWorkItem: jest.fn(),
    findOneMapping: jest.fn(),
    updateMapping: jest.fn(),
    submitPhoto: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ComponentsController],
      providers: [{ provide: ComponentsService, useValue: componentsService }],
    }).compile();

    controller = moduleRef.get<ComponentsController>(ComponentsController);
    jest.clearAllMocks();
  });

  it('findMasterComponents delegates to service', async () => {
    await controller.findMasterComponents();
    expect(componentsService.findMasterComponents).toHaveBeenCalled();
  });

  it('uploadComponentPhoto delegates to service', async () => {
    const req = { user: { userId: 'em1' } } as Parameters<
      ComponentsController['uploadComponentPhoto']
    >[3];
    const file = {
      originalname: 'a.jpg',
    } as unknown as Parameters<ComponentsController['uploadComponentPhoto']>[1];
    const dto = {
      progress: '10',
      latitude: 1,
      longitude: 1,
      timestamp: new Date(),
    } as Parameters<ComponentsController['uploadComponentPhoto']>[2];

    await controller.uploadComponentPhoto('c1', file, dto, req);
    expect(componentsService.uploadPhoto).toHaveBeenCalledWith(
      'c1',
      file,
      dto,
      'em1',
    );
  });

  it('selectPhoto delegates to service', async () => {
    const req = { user: { userId: 'co1' } } as Parameters<
      ComponentsController['selectPhoto']
    >[2];
    const dto = { photoId: 'p1' } as Parameters<
      ComponentsController['selectPhoto']
    >[1];
    await controller.selectPhoto('c1', dto, req);
    expect(componentsService.selectPhoto).toHaveBeenCalledWith(
      'c1',
      'p1',
      'co1',
    );
  });

  it('uploadComponentPhotoUrl delegates to service', async () => {
    const req = { user: { userId: 'em1' } } as Parameters<
      ComponentsController['uploadComponentPhotoUrl']
    >[2];
    const dto = {
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v123/sample.jpg',
      progress: '10',
      latitude: 1,
      longitude: 1,
      timestamp: new Date(),
    } as Parameters<ComponentsController['uploadComponentPhotoUrl']>[1];

    await controller.uploadComponentPhotoUrl('c1', dto, req);
    expect(componentsService.uploadPhotoUrl).toHaveBeenCalledWith(
      'c1',
      dto,
      'em1',
    );
  });
});
