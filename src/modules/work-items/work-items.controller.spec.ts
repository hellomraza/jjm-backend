import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { WorkItemStatus } from './entities/work-item.entity';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

describe('WorkItemsController', () => {
  let controller: WorkItemsController;
  const workItemsService = {
    create: jest.fn(),
    getMyWorkItems: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WorkItemsController],
      providers: [{ provide: WorkItemsService, useValue: workItemsService }],
    }).compile();

    controller = moduleRef.get<WorkItemsController>(WorkItemsController);
    jest.clearAllMocks();
  });

  it('create delegates to service', async () => {
    const dto = { title: 'W' } as Parameters<WorkItemsController['create']>[0];
    await controller.create(dto);
    expect(workItemsService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to service', async () => {
    await controller.findAll(1, 20);
    expect(workItemsService.findAll).toHaveBeenCalledWith(1, 20);
  });

  it('getMyWorkItems delegates to service with auth user context', async () => {
    const req = { user: { userId: 'u1', role: UserRole.CO } } as Parameters<
      WorkItemsController['getMyWorkItems']
    >[0];

    await controller.getMyWorkItems(req, 2, 10);
    expect(workItemsService.getMyWorkItems).toHaveBeenCalledWith(
      'u1',
      UserRole.CO,
      2,
      10,
    );
  });

  it('findOne delegates to service', async () => {
    await controller.findOne('w1');
    expect(workItemsService.findOne).toHaveBeenCalledWith('w1');
  });

  it('update delegates to service', async () => {
    const dto = { description: 'd' } as Parameters<
      WorkItemsController['update']
    >[1];
    await controller.update('w1', dto);
    expect(workItemsService.update).toHaveBeenCalledWith('w1', dto);
  });

  it('updateStatus delegates to service', async () => {
    await controller.updateStatus('w1', WorkItemStatus.IN_PROGRESS);
    expect(workItemsService.updateStatus).toHaveBeenCalledWith(
      'w1',
      WorkItemStatus.IN_PROGRESS,
    );
  });

  it('remove delegates to service', async () => {
    await controller.remove('w1');
    expect(workItemsService.remove).toHaveBeenCalledWith('w1');
  });
});
