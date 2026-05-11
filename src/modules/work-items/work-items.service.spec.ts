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
    getWorkItemIdsForContractor: jest.fn(),
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
      district_id: 10,
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

  it('bulkCreateFromImport creates a temporary contractor when contractor code is missing', async () => {
    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager),
    );

    manager.findOne.mockImplementation(async (entity, options) => {
      if (entity === User) {
        expect(options.where.code).toBe('TAT001');
        return null;
      }

      if (entity === WorkItem) {
        expect(options.where.work_code).toBe('WORK001');
        return null;
      }

      return null;
    });

    manager.save.mockImplementation(async (entity, payload) => {
      if (entity === User) {
        return { ...payload, id: 'temp-contractor-id' };
      }

      if (entity === WorkItem) {
        return { ...payload, id: 'work-item-id' };
      }

      return payload;
    });

    const result = await service.bulkCreateFromImport([
      {
        workcode: 'WORK001',
        schemetype: 'PWS',
        contractor_code: 'TAT001',
        excel: null,
        district_code: null,
        block_code: null,
        panchayat_code: null,
        schemecategory: null,
        nofhtc: null,
        aa_amount: null,
        payment_rs: null,
        sr: null,
        systemdate: null,
        workcodeid: null,
      } as any,
    ]);

    expect(result).toHaveLength(1);
    expect(manager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        code: 'TAT001',
        name: 'Temporary Contractor TAT001',
        role: UserRole.CO,
        email: expect.stringMatching(
          /^temp-contractor-[a-f0-9]+@import\.local$/,
        ),
      }),
    );
  });

  it('bulkCreateFromImport updates an existing temporary contractor with the same code', async () => {
    const existingTempContractor = {
      id: 'temp-contractor-id',
      code: 'TAT001',
      email: 'temp-contractor-old@import.local',
      password: 'old-password',
      name: 'Temporary Contractor Old',
      role: UserRole.CO,
    };

    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager),
    );

    manager.findOne.mockImplementation(async (entity, options) => {
      if (entity === User) {
        expect(options.where.code).toBe('TAT001');
        return existingTempContractor;
      }

      if (entity === WorkItem) {
        expect(options.where.work_code).toBe('WORK002');
        return null;
      }

      return null;
    });

    manager.save.mockImplementation(async (entity, payload) => {
      if (entity === User) {
        return { ...payload, id: 'temp-contractor-id' };
      }

      if (entity === WorkItem) {
        return { ...payload, id: 'work-item-id' };
      }

      return payload;
    });

    await service.bulkCreateFromImport([
      {
        workcode: 'WORK002',
        schemetype: 'PWS',
        contractor_code: 'TAT001',
        excel: null,
        district_code: null,
        block_code: null,
        panchayat_code: null,
        schemecategory: null,
        nofhtc: null,
        aa_amount: null,
        payment_rs: null,
        sr: null,
        systemdate: null,
        workcodeid: null,
      } as any,
    ]);

    expect(manager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        id: 'temp-contractor-id',
        code: 'TAT001',
        name: 'Temporary Contractor TAT001',
        role: UserRole.CO,
        email: expect.stringMatching(
          /^temp-contractor-[a-f0-9]+@import\.local$/,
        ),
      }),
    );
  });

  it('bulkCreateFromImport updates an existing temporary work item with the same workcode', async () => {
    const existingTempWorkItem = {
      id: 'temp-work-item-id',
      work_code: 'WORK003',
      title: 'Temporary Work Item WORK003',
      description: 'Temporary work item created during agreement import',
      district_id: null,
      schemetype: 'TEMP',
      contractor_id: 'old-contractor-id',
      latitude: 0,
      longitude: 0,
      progress_percentage: 0,
      status: WorkItemStatus.PENDING,
    };

    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager),
    );

    manager.findOne.mockImplementation(async (entity, options) => {
      if (entity === User && options.where.role === UserRole.CO) {
        return {
          id: 'contractor-id',
          code: 'TAT003',
          role: UserRole.CO,
          email: 'real.contractor@example.com',
          name: 'Real Contractor',
        };
      }

      if (entity === WorkItem) {
        expect(options.where.work_code).toBe('WORK003');
        return existingTempWorkItem;
      }

      return null;
    });

    manager.save.mockImplementation(async (_entity, payload) => payload);

    const result = await service.bulkCreateFromImport([
      {
        workcode: 'WORK003',
        schemetype: 'PWS',
        contractor_code: 'TAT003',
        excel: 'EX-003',
        district_code: 'CG-RPR',
        block_code: null,
        panchayat_code: null,
        schemecategory: null,
        nofhtc: null,
        aa_amount: null,
        payment_rs: null,
        sr: null,
        systemdate: null,
        workcodeid: null,
      } as any,
    ]);

    expect(result).toHaveLength(1);
    expect(manager.save).toHaveBeenCalledWith(
      WorkItem,
      expect.objectContaining({
        id: 'temp-work-item-id',
        work_code: 'WORK003',
        title: 'WORK003',
        schemetype: 'PWS',
        district_id: 'CG-RPR',
        contractor_id: 'contractor-id',
        excel: 'EX-003',
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

  it('assignMultipleEmployeesToWorkItem throws when work item is missing', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.assignMultipleEmployeesToWorkItem('co1', 'missing', ['em1']),
    ).rejects.toThrow(NotFoundException);
  });

  it('assignMultipleEmployeesToWorkItem throws when contractor does not own work item', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co2',
    });

    await expect(
      service.assignMultipleEmployeesToWorkItem('co1', 'w1', ['em1']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('assignMultipleEmployeesToWorkItem assigns valid employees and skips invalid ones', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'w1',
      contractor_id: 'co1',
    });

    const validEmployee = { id: 'em1', role: UserRole.EM };
    const invalidEmployee = { id: 'do1', role: UserRole.DO };

    let callCount = 0;
    (usersRepository.findOne as jest.Mock).mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? validEmployee : invalidEmployee;
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

    const result = await service.assignMultipleEmployeesToWorkItem(
      'co1',
      'w1',
      ['em1', 'do1'],
    );

    expect(result.created).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.summary).toEqual({ total: 2, created: 1, failed: 1 });
    expect(result.failed[0].employee_id).toBe('do1');
  });

  it('assignMultipleEmployeesToWorkItem handles existing assignments', async () => {
    const existingAssignment = {
      id: 'a1',
      work_item_id: 'w1',
      employee_id: 'em1',
    };

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
    ).mockResolvedValue(existingAssignment);

    const result = await service.assignMultipleEmployeesToWorkItem(
      'co1',
      'w1',
      ['em1'],
    );

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toEqual(existingAssignment);
    expect(result.failed).toHaveLength(0);
    expect(workItemEmployeeAssignmentsRepository.save).not.toHaveBeenCalled();
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
      district_id: 'DIST001',
    });
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.getMyWorkItems('do1', UserRole.DO, 1, 20);

    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { district_id: 'DIST001' } }),
    );
  });

  it('getMyWorkItems filters by contractor for CO', async () => {
    (
      agreementsService.getWorkItemIdsForContractor as jest.Mock
    ).mockResolvedValue(['w1', 'w2']);
    (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

    await service.getMyWorkItems('co1', UserRole.CO, 1, 20);

    expect(workItemsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contractor_id: 'co1', id: expect.anything() },
      }),
    );
  });

  it('getMyWorkItems returns empty result for CO with no agreements', async () => {
    (
      agreementsService.getWorkItemIdsForContractor as jest.Mock
    ).mockResolvedValue([]);

    const result = await service.getMyWorkItems('co1', UserRole.CO, 1, 20);

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    expect(workItemsRepository.findAndCount).not.toHaveBeenCalled();
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

  it('getDistrictOfficerByWorkItem returns DO without password', async () => {
    const workItem = { id: 'w1', district_id: 10 };
    const districtOfficer = {
      id: 'do1',
      code: 'DO123',
      email: 'do@example.com',
      name: 'DO Name',
      role: UserRole.DO,
      district_id: 10,
      password: 'hashed_password',
      created_at: new Date(),
      updated_at: new Date(),
    };

    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(workItem);
    (usersRepository.findOne as jest.Mock).mockResolvedValue(districtOfficer);

    const result = await service.getDistrictOfficerByWorkItem('w1');

    expect(result).toEqual({
      id: 'do1',
      code: 'DO123',
      email: 'do@example.com',
      name: 'DO Name',
      role: UserRole.DO,
      district_id: 10,
      created_at: districtOfficer.created_at,
      updated_at: districtOfficer.updated_at,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('getDistrictOfficerByWorkItem throws when work item not found', async () => {
    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getDistrictOfficerByWorkItem('missing'),
    ).rejects.toThrow(NotFoundException);
  });

  it('getDistrictOfficerByWorkItem throws when DO not found for district', async () => {
    const workItem = { id: 'w1', district_id: 10 };

    (workItemsRepository.findOne as jest.Mock).mockResolvedValue(workItem);
    (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.getDistrictOfficerByWorkItem('w1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
