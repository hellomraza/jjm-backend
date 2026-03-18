import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Component } from '../components/entities/component.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItemEmployeeAssignment } from './entities/work-item-employee-assignment.entity';
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
  const workItemEmployeeAssignmentsRepository = {
    find: jest.fn(),
  } as unknown as Repository<WorkItemEmployeeAssignment>;
  const usersRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;
  const dataSource = { transaction: jest.fn() } as unknown as DataSource;

  beforeEach(() => {
    service = new WorkItemsService(
      workItemsRepository,
      componentsRepository,
      workItemComponentsRepository,
      workItemEmployeeAssignmentsRepository,
      usersRepository,
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

  it('getMyWorkItems returns all items for HO', async () => {
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([
      [{ id: 'w1' }],
      1,
    ]);

    const result = await service.getMyWorkItems('ho1', UserRole.HO, 1, 20);

    expect(result.total).toBe(1);
    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('getMyWorkItems filters by district for DO', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'do1',
      district_id: '10',
    });
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.getMyWorkItems('do1', UserRole.DO, 1, 20);

    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { district_id: '10' } }),
    );
  });

  it('getMyWorkItems filters by contractor for CO', async () => {
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.getMyWorkItems('co1', UserRole.CO, 1, 20);

    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contractor_id: 'co1' } }),
    );
  });

  it('getMyWorkItems filters by assigned work items for EM', async () => {
    (workItemEmployeeAssignmentsRepository.find as jest.Mock).mockResolvedValue([
      { work_item_id: 'w2' },
      { work_item_id: 'w3' },
      { work_item_id: 'w2' },
    ]);
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.getMyWorkItems('em1', UserRole.EM, 1, 20);

    expect(workItemEmployeeAssignmentsRepository.find).toHaveBeenCalledWith({
      where: { employee_id: 'em1' },
      select: ['work_item_id'],
    });
    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: expect.anything() } }),
    );
  });

  it('getMyWorkItems returns empty result for EM with no assigned work items', async () => {
    (workItemEmployeeAssignmentsRepository.find as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await service.getMyWorkItems('em1', UserRole.EM, 1, 20);

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    expect(workItemsRepository.findAndCount).not.toHaveBeenCalled();
  });
});
