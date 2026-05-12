/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { Agreement } from './entities/agreement.entity';

describe('AgreementsService', () => {
  let service: AgreementsService;

  const agreementsRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as Repository<Agreement>;

  const usersRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;

  const workItemsRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<WorkItem>;

  beforeEach(() => {
    service = new AgreementsService(
      agreementsRepository,
      usersRepository,
      workItemsRepository,
    );
    jest.clearAllMocks();
  });

  it('findOne throws when agreement not found', async () => {
    (agreementsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create throws when contractor is missing', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

    const dto: CreateAgreementDto = {
      contractor_id: 'c1',
      work_id: 'w1',
      agreementno: 'AG-001',
      agreementyear: '2025',
      division_code: 'DIST001',
      workorderno: 'WO-001',
      workorderdate: new Date(),
    };

    await expect(service.create(dto)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('bulkCreateFromImport creates temporary contractor and work item when codes are missing', async () => {
    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (agreementsRepository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    manager.findOne.mockImplementation((entity, options) => {
      if (entity === User) {
        expect(options.where.code).toBe('TAT001');
        return null;
      }

      if (entity === WorkItem) {
        expect(options.where.work_code).toBe('WORK001');
        return null;
      }

      if (entity === Agreement && options?.select) {
        return null;
      }

      if (entity === Agreement) {
        return {
          id: 'agreement-id',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'temp-contractor-id',
          work_id: 'work-id',
        };
      }

      return null;
    });

    manager.save.mockImplementation((entity, payload) => {
      if (entity === User) {
        return { ...payload, id: 'temp-contractor-id' };
      }

      if (entity === WorkItem) {
        return { ...payload, id: 'temp-work-id' };
      }

      return { ...payload, id: 'agreement-id' };
    });

    await service.bulkCreateFromImport([
      {
        agrid: null,
        agreementno: 'AGR001',
        agreementyear: '2025-2026',
        division_code: null,
        contractor_code: 'TAT001',
        workcode: 'WORK001',
        workorderno: null,
        workorderdate: null,
        systemdate: null,
        unitag: null,
        excel: null,
        sr: null,
      },
    ]);

    expect(manager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        code: 'TAT001',
        email: expect.stringMatching(
          /^temp-contractor-[a-f0-9]+@import\.local$/,
        ),
        name: 'Temporary Contractor TAT001',
        role: UserRole.CO,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      WorkItem,
      expect.objectContaining({
        work_code: 'WORK001',
        title: 'Temporary Work Item WORK001',
        district_id: null,
        schemetype: 'TEMP',
        contractor_id: 'temp-contractor-id',
        latitude: 0,
        longitude: 0,
        progress_percentage: 0,
        status: WorkItemStatus.PENDING,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      Agreement,
      expect.objectContaining({
        contractor_id: 'temp-contractor-id',
        work_id: 'temp-work-id',
      }),
    );
  });

  it('bulkCreateFromImport updates existing temporary contractor and work item', async () => {
    const existingContractor = {
      id: 'temp-contractor-id',
      code: 'TAT001',
      email: 'temp-contractor-old@import.local',
      password: 'old-password',
      name: 'Temporary Contractor Old',
      role: UserRole.CO,
    } as User;

    const existingWorkItem = {
      id: 'temp-work-id',
      work_code: 'WORK001',
      title: 'Temporary Work Item Old',
      description: 'Old temp work item',
      district_id: 'DIST001',
      schemetype: 'TEMP',
      contractor_id: 'old-contractor-id',
      latitude: 1,
      longitude: 1,
      progress_percentage: 50,
      status: WorkItemStatus.IN_PROGRESS,
      created_at: new Date(),
      updated_at: new Date(),
    } as WorkItem;

    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (agreementsRepository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    manager.findOne.mockImplementation((entity, options) => {
      if (entity === User) {
        expect(options.where.code).toBe('TAT001');
        return existingContractor;
      }

      if (entity === WorkItem) {
        expect(options.where.work_code).toBe('WORK001');
        return existingWorkItem;
      }

      if (entity === Agreement && options?.select) {
        return null;
      }

      if (entity === Agreement) {
        return {
          id: 'agreement-id',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'temp-contractor-id',
          work_id: 'temp-work-id',
        };
      }

      return null;
    });

    manager.save.mockImplementation((entity, payload) => {
      if (entity === User) {
        return { ...payload, id: 'temp-contractor-id' };
      }

      if (entity === WorkItem) {
        return { ...payload, id: 'temp-work-id' };
      }

      return { ...payload, id: 'agreement-id' };
    });

    await service.bulkCreateFromImport([
      {
        agrid: null,
        agreementno: 'AGR001',
        agreementyear: '2025-2026',
        division_code: null,
        contractor_code: 'TAT001',
        workcode: 'WORK001',
        workorderno: null,
        workorderdate: null,
        systemdate: null,
        unitag: null,
        excel: null,
        sr: null,
      },
    ]);

    expect(manager.save).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        id: 'temp-contractor-id',
        code: 'TAT001',
        email: expect.stringMatching(
          /^temp-contractor-[a-f0-9]+@import\.local$/,
        ),
        name: 'Temporary Contractor TAT001',
        role: UserRole.CO,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      WorkItem,
      expect.objectContaining({
        id: 'temp-work-id',
        work_code: 'WORK001',
        title: 'Temporary Work Item WORK001',
        district_id: null,
        schemetype: 'TEMP',
        contractor_id: 'temp-contractor-id',
        latitude: 0,
        longitude: 0,
        progress_percentage: 0,
        status: WorkItemStatus.PENDING,
      }),
    );
  });
});
