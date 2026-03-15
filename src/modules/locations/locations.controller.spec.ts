import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationMasterType } from './locations.types';

describe('LocationsController', () => {
  let controller: LocationsController;
  const locationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: locationsService }],
    }).compile();

    controller = moduleRef.get<LocationsController>(LocationsController);
    jest.clearAllMocks();
  });

  it('create delegates to service', async () => {
    const dto = { name: 'District', code: 'D1' } as Parameters<
      LocationsController['create']
    >[1];
    await controller.create(LocationMasterType.DISTRICTS, dto);
    expect(locationsService.create).toHaveBeenCalledWith(
      LocationMasterType.DISTRICTS,
      dto,
    );
  });

  it('findAll delegates to service', async () => {
    await controller.findAll(LocationMasterType.DISTRICTS, 1, 20);
    expect(locationsService.findAll).toHaveBeenCalledWith(
      LocationMasterType.DISTRICTS,
      1,
      20,
    );
  });

  it('remove delegates to service', async () => {
    await controller.remove(LocationMasterType.DISTRICTS, 1);
    expect(locationsService.remove).toHaveBeenCalledWith(
      LocationMasterType.DISTRICTS,
      1,
    );
  });
});
