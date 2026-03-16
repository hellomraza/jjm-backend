import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Component } from '../components/entities/component.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { WorkItem, WorkItemStatus } from './entities/work-item.entity';
import { WorkItemsService } from './work-items.service';

describe('WorkItemsService', () => {
  let service: WorkItemsService;

  const workItemsRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as Repository<WorkItem>;

  const componentsRepository = {} as Repository<Component>;
  const workItemComponentsRepository = {} as Repository<WorkItemComponent>;
  const dataSource = { transaction: jest.fn() } as unknown as DataSource;

  beforeEach(() => {
    service = new WorkItemsService(
      workItemsRepository,
      componentsRepository,
      workItemComponentsRepository,
      dataSource,
    );
    jest.clearAllMocks();
  });

  it('findAll returns paginated data', async () => {
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([
      [{ id: 'w1' }],
      1,
    ]);

    const result = await service.findAll(1, 20);

    expect(result.total).toBe(1);
    expect(result.data).toEqual([{ id: 'w1' }]);
  });

  it('findOne throws when missing', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('updateStatus sets progress to 100 for completed', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      progress_percentage: 10,
      status: WorkItemStatus.PENDING,
    });
    (workItemsRepository.save as jest.Mock).mockImplementation((item) =>
      Promise.resolve(item),
    );

    const result = await service.updateStatus('w1', WorkItemStatus.COMPLETED);

    expect(result.progress_percentage).toBe(100);
  });
});
