import { Test, TestingModule } from '@nestjs/testing';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

describe('PhotosController', () => {
  let controller: PhotosController;
  const photosService = {
    uploadPhoto: jest.fn(),
    findAll: jest.fn(),
    reviewByComponent: jest.fn(),
    selectBestPhoto: jest.fn(),
    forwardSelectedPhoto: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PhotosController],
      providers: [{ provide: PhotosService, useValue: photosService }],
    }).compile();

    controller = moduleRef.get<PhotosController>(PhotosController);
    jest.clearAllMocks();
  });

  it('upload delegates to service', async () => {
    const file = {
      originalname: 'a.jpg',
    } as unknown as Parameters<PhotosController['upload']>[0];
    const dto = {
      latitude: 1,
      longitude: 1,
      component_id: 'c1',
      work_item_id: 'w1',
      timestamp: new Date(),
    } as Parameters<PhotosController['upload']>[1];
    const req = { user: { userId: 'em1' } };

    await controller.upload(file, dto, req);
    expect(photosService.uploadPhoto).toHaveBeenCalledWith(file, dto, 'em1');
  });

  it('findAll delegates to service', async () => {
    await controller.findAll(1, 20);
    expect(photosService.findAll).toHaveBeenCalledWith(1, 20);
  });

  it('selectBestPhoto delegates to service', async () => {
    const req = { user: { userId: 'co1' } };
    await controller.selectBestPhoto('p1', req);
    expect(photosService.selectBestPhoto).toHaveBeenCalledWith('p1', 'co1');
  });
});
