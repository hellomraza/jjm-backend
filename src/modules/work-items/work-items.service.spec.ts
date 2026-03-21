import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
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

  const workItemEmployeeAssignmentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<WorkItemEmployeeAssignment>;
  const usersRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;
  const agreementsService = {
    createWithManager: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() } as unknown as DataSource;

  beforeEach(() => {
    service = new WorkItemsService(
      workItemsRepository,
      workItemEmployeeAssignmentsRepository,
      usersRepository,
      agreementsService as any,
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

  it('create also creates an agreement for the work item', async () => {
    const createDto = {
      title: 'Work 1',
      district_id: 'd1',
      contractor_id: 'c1',
      schemetype: 'PWS',
      latitude: 25.5941,
      longitude: 85.1376,
    } as any;

    const masterComponents = Array.from({ length: 12 }, (_, i) => ({
      id: `comp-${i + 1}`,
      order_number: i + 1,
    }));

    const manager = {
      find: jest.fn().mockResolvedValue(masterComponents),
      create: jest.fn((_: unknown, data: unknown) => data),
      save: jest.fn((entity: unknown, data: any) => {
        if (entity === WorkItem) {
          return Promise.resolve({ id: 'w1', ...data });
        }

        return Promise.resolve(data);
      }),
      exists: jest.fn().mockResolvedValue(false),
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager),
    );
    agreementsService.createWithManager.mockResolvedValue({ id: 'a1' });

    const result = await service.create(createDto);

    expect(result.id).toBe('w1');
    expect(agreementsService.createWithManager).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        work_id: 'w1',
        contractor_id: 'c1',
      }),
    );
  });

  it('findOne throws when missing', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('assignEmployeeToWorkItem throws when work item is missing', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.assignEmployeeToWorkItem('co1', 'missing', 'em1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('assignEmployeeToWorkItem throws when contractor does not own work item', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co2',
    });

    await expect(
      service.assignEmployeeToWorkItem('co1', 'w1', 'em1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('assignEmployeeToWorkItem throws when employee user is invalid', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co1',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'do1',
      role: UserRole.DO,
    });

    await expect(
      service.assignEmployeeToWorkItem('co1', 'w1', 'do1'),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('assignEmployeeToWorkItem returns existing assignment if already present', async () => {
    const assignment = { id: 'a1', work_item_id: 'w1', employee_id: 'em1' };
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co1',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'em1',
      role: UserRole.EM,
    });
    (
      workItemEmployeeAssignmentsRepository.findOne as jest.Mock
    ).mockResolvedValue(assignment);

    const result = await service.assignEmployeeToWorkItem('co1', 'w1', 'em1');

    expect(result).toEqual(assignment);
    expect(workItemEmployeeAssignmentsRepository.save).not.toHaveBeenCalled();
  });

  it('assignEmployeeToWorkItem creates assignment for valid contractor and employee', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co1',
    });
    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'em1',
      role: UserRole.EM,
    });
    (
      workItemEmployeeAssignmentsRepository.findOne as jest.Mock
    ).mockResolvedValue(null);
    (workItemEmployeeAssignmentsRepository.create as jest.Mock).mockReturnValue(
      {
        work_item_id: 'w1',
        employee_id: 'em1',
      },
    );
    (workItemEmployeeAssignmentsRepository.save as jest.Mock).mockResolvedValue(
      {
        id: 'a1',
        work_item_id: 'w1',
        employee_id: 'em1',
      },
    );

    const result = await service.assignEmployeeToWorkItem('co1', 'w1', 'em1');

    expect(result).toEqual({
      id: 'a1',
      work_item_id: 'w1',
      employee_id: 'em1',
    });
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
    (workItemEmployeeAssignmentsRepository.find as jest.Mock).mockResolvedValue(
      [{ work_item_id: 'w2' }, { work_item_id: 'w3' }, { work_item_id: 'w2' }],
    );
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
