import { Test, TestingModule } from '@nestjs/testing';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

describe('AgreementsController', () => {
  let controller: AgreementsController;
  const agreementsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AgreementsController],
      providers: [{ provide: AgreementsService, useValue: agreementsService }],
    }).compile();

    controller = moduleRef.get<AgreementsController>(AgreementsController);
    jest.clearAllMocks();
  });

  it('create delegates to service', async () => {
    const dto = { contractor_id: 'c1', work_id: 'w1' } as Parameters<
      AgreementsController['create']
    >[0];
    await controller.create(dto);
    expect(agreementsService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to service', async () => {
    await controller.findAll(1, 20);
    expect(agreementsService.findAll).toHaveBeenCalledWith(1, 20);
  });

  it('remove delegates to service', async () => {
    await controller.remove('a1');
    expect(agreementsService.remove).toHaveBeenCalledWith('a1');
  });
});
