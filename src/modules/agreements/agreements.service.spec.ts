/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { AgreementsService } from './agreements.service';
import { AttachAgreementFileDto } from './dto/attach-agreement-file.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { AgreementFile } from './entities/agreement-file.entity';
import { AgreementFileMap } from './entities/agreement-file-map.entity';
import { Agreement } from './entities/agreement.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';

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
    find: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
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
      work_ids: ['w1'],
      agreementno: 'AG-001',
      agreementyear: '2025',
      division_code: 'DIST001',
      workorderno: 'WO-001',
      workorderdate: '2025-01-01',
    };

    await expect(service.create(dto)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('create successfully creates agreement with optional fields (contractor_id and work_ids)', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue({ id: 'c1' });
    (workItemsRepository.find as jest.Mock).mockResolvedValue([{ id: 'w1' }]);
    (agreementsRepository.create as jest.Mock).mockImplementation((data) => data);
    (agreementsRepository.save as jest.Mock).mockResolvedValue({ id: 'a1', agreementno: 'AG-001', contractor_id: 'c1' });
    (agreementsRepository.findOne as jest.Mock).mockResolvedValue({ id: 'a1', agreementno: 'AG-001', contractor_id: 'c1' });

    const dto: CreateAgreementDto = {
      contractor_id: 'c1',
      work_ids: ['w1'],
      agreementno: 'AG-001',
      agreementyear: '2025',
      division_code: 'DIST001',
      workorderno: 'WO-001',
      workorderdate: '2025-01-01',
      excel: 'sheet1.xlsx',
    };

    const result = await service.create(dto);
    expect(result).toBeDefined();
    expect(result.id).toBe('a1');
    expect(result.agreementno).toBe('AG-001');
    expect(workItemsRepository.update).toHaveBeenCalledWith(
      { id: In(['w1']) },
      { agreement_id: 'a1', contractor_id: 'c1' },
    );
  });

  it('create successfully creates agreement without optional contractor_id and work_ids', async () => {
    (agreementsRepository.create as jest.Mock).mockImplementation((data) => data);
    (agreementsRepository.save as jest.Mock).mockResolvedValue({ id: 'a2', agreementno: 'AG-002' });
    (agreementsRepository.findOne as jest.Mock).mockResolvedValue({ id: 'a2', agreementno: 'AG-002' });

    const dto: CreateAgreementDto = {
      agreementno: 'AG-002',
      agreementyear: '2025',
      division_code: 'DIST001',
    };

    const result = await service.create(dto);
    expect(result).toBeDefined();
    expect(result.id).toBe('a2');
    expect(result.agreementno).toBe('AG-002');
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
        if (options?.where && 'agreementno' in options.where) {
          return null;
        }
        return {
          id: 'agreement-id',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'temp-contractor-id',
          workItems: [{ id: 'work-id' } as any],
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

    const result = await service.bulkCreateFromImport([
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

    expect(result.inserted).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

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
        if (options?.where && 'agreementno' in options.where) {
          return null;
        }
        return {
          id: 'agreement-id',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'temp-contractor-id',
          workItems: [{ id: 'temp-work-id' } as any],
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

    const result = await service.bulkCreateFromImport([
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

    expect(result.inserted).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

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

  it('attachFileToAgreement attaches a pdf file to an agreement', async () => {
    const agreement = {
      id: 'agreement-id',
      agreementno: 'AGR001',
      agreementyear: '2025-2026',
      contractor_id: 'temp-contractor-id',
      workItems: [{ id: 'temp-work-id' } as any],
      created_at: new Date(),
      updated_at: new Date(),
      agreementFileMaps: [],
    } as Agreement;

    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (agreementsRepository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    manager.findOne.mockImplementation(async (entity, options) => {
      if (entity === Agreement) {
        expect(options.where.id).toBe('agreement-id');
        return agreement;
      }

      if (entity === AgreementFile) {
        return null;
      }

      return null;
    });

    manager.save.mockImplementation(async (entity, payload) => {
      if (entity === AgreementFile) {
        return {
          ...payload,
          id: 'file-id',
          created_at: new Date(),
          updated_at: new Date(),
        };
      }

      if (entity === AgreementFileMap) {
        return {
          ...payload,
          id: 'map-id',
          created_at: new Date(),
          updated_at: new Date(),
        };
      }

      return payload;
    });

    const result = await service.attachFileToAgreement(
      'agreement-id',
      {
        fileUrl: 'https://cdn.example.com/agreements/agreement.pdf',
        fileName: 'agreement.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      } as AttachAgreementFileDto,
      { userId: 'user-id', role: UserRole.HO },
    );

    expect(result.file.file_url).toBe(
      'https://cdn.example.com/agreements/agreement.pdf',
    );
    expect(result.mapping.agreement_file_id).toBe('file-id');
    expect(manager.save).toHaveBeenCalledWith(
      AgreementFile,
      expect.objectContaining({
        file_url: 'https://cdn.example.com/agreements/agreement.pdf',
        uploaded_by_user_id: 'user-id',
        uploaded_by_role: UserRole.HO,
      }),
    );
  });

  it('attachFileToAgreement rejects duplicate pdf urls', async () => {
    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(),
    };

    (agreementsRepository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    manager.findOne.mockImplementation(async (entity) => {
      if (entity === Agreement) {
        return {
          id: 'agreement-id',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'temp-contractor-id',
          workItems: [{ id: 'temp-work-id' } as any],
        } as Agreement;
      }

      if (entity === AgreementFile) {
        return {
          id: 'file-id',
          file_url: 'https://cdn.example.com/agreements/agreement.pdf',
        } as AgreementFile;
      }

      return null;
    });

    await expect(
      service.attachFileToAgreement(
        'agreement-id',
        {
          fileUrl: 'https://cdn.example.com/agreements/agreement.pdf',
          mimeType: 'application/pdf',
        } as AttachAgreementFileDto,
        { userId: 'user-id', role: UserRole.HO },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('attachFileToAgreement rejects non-HO users', async () => {
    await expect(
      service.attachFileToAgreement(
        'agreement-id',
        {
          fileUrl: 'https://cdn.example.com/agreements/agreement.pdf',
          mimeType: 'application/pdf',
        } as AttachAgreementFileDto,
        { userId: 'user-id', role: UserRole.DO },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('findAllForUser with search and filter', () => {
    it('should query without search/filter and with correct pagination', async () => {
      (agreementsRepository.findAndCount as jest.Mock).mockResolvedValue([[/* agreements */], 0]);

      const result = await service.findAllForUser('ho-id', UserRole.HO, 1, 10);

      expect(agreementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 10,
        }),
      );
      expect(result.data).toBeDefined();
      expect(result.total).toBe(0);
    });

    it('should query with search (Like) and agreementyear filters', async () => {
      (agreementsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForUser('ho-id', UserRole.HO, 2, 15, 'AGR-123', '2025-26');

      expect(agreementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agreementno: expect.anything(), // will be a Like operator
            agreementyear: '2025-26',
          }),
          skip: 15,
          take: 15,
        }),
      );
    });

    it('should combine search/filter parameters with contractor role access controls', async () => {
      (agreementsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForUser('contractor-id', UserRole.CO, 1, 20, 'AGR-456', '2026-27');

      expect(agreementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractor_id: 'contractor-id',
            agreementno: expect.anything(),
            agreementyear: '2026-27',
          }),
        }),
      );
    });

    it('should restrict agreements to assigned work items for EM role', async () => {
      const manager = {
        find: jest.fn().mockResolvedValue([{ work_item_id: 'w-123' }]),
      };
      (agreementsRepository as any).manager = manager;

      (agreementsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForUser('employee-id', UserRole.EM, 1, 10);

      expect(manager.find).toHaveBeenCalledWith(
        WorkItemEmployeeAssignment,
        expect.objectContaining({
          where: { employee_id: 'employee-id' },
          select: ['work_item_id'],
        }),
      );
      expect(agreementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workItems: { id: In(['w-123']) },
          }),
        }),
      );
    });

    it('should return no access if EM role has no assignments', async () => {
      const manager = {
        find: jest.fn().mockResolvedValue([]),
      };
      (agreementsRepository as any).manager = manager;

      (agreementsRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForUser('employee-id', UserRole.EM, 1, 10);

      expect(agreementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: '__no_access__',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws BadRequestException if trying to edit contractor_id when already assigned', async () => {
      const agreement = { id: 'a1', contractor_id: 'c1', workItems: [] };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);

      await expect(service.update('a1', { contractor_id: 'c2' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('assigns contractor_id if not previously assigned, and propagates to work items', async () => {
      const agreement = { id: 'a1', contractor_id: null, workItems: [] };
      const contractor = { id: 'c1' };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);
      (usersRepository.findOne as jest.Mock).mockResolvedValue(contractor);
      (agreementsRepository.save as jest.Mock).mockImplementation(async (item) => item);

      const result = await service.update('a1', { contractor_id: 'c1' });

      expect(result.contractor_id).toBe('c1');
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(workItemsRepository.update).toHaveBeenCalledWith(
        { agreement_id: 'a1' },
        { contractor_id: 'c1' },
      );
    });

    it('throws BadRequestException if trying to remove an existing work order from the agreement', async () => {
      const agreement = {
        id: 'a1',
        contractor_id: 'c1',
        workItems: [{ id: 'w1' }, { id: 'w2' }],
      };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);

      await expect(service.update('a1', { work_ids: ['w2'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if adding a work order that already has another agreement assigned', async () => {
      const agreement = {
        id: 'a1',
        contractor_id: 'c1',
        workItems: [{ id: 'w1' }],
      };
      const existingWorkItems = [
        { id: 'w2', agreement_id: 'a2' },
      ];
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);
      (workItemsRepository.find as jest.Mock).mockResolvedValue(existingWorkItems);

      await expect(service.update('a1', { work_ids: ['w1', 'w2'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully adds new work orders with no agreement assigned to the agreement', async () => {
      const agreement = {
        id: 'a1',
        contractor_id: 'c1',
        workItems: [{ id: 'w1' }],
      };
      const addedWorkItems = [
        { id: 'w2', agreement_id: null },
      ];
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);
      (workItemsRepository.find as jest.Mock).mockResolvedValue(addedWorkItems);
      (agreementsRepository.save as jest.Mock).mockImplementation(async (item) => item);

      const result = await service.update('a1', { work_ids: ['w1', 'w2'] });

      expect(workItemsRepository.update).toHaveBeenCalledWith(
        { id: In(['w2']) },
        { agreement_id: 'a1', contractor_id: 'c1' },
      );
    });
  });

  describe('findWorkItemsForAgreement', () => {
    it('throws when agreement is not found or user lacks access', async () => {
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findWorkItemsForAgreement('a1', 'u1', UserRole.CO),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns only assigned work items for EM role', async () => {
      const agreement = { id: 'a1', workItems: [] };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);

      const manager = {
        find: jest.fn().mockResolvedValue([{ work_item_id: 'w1' }]),
      };
      (agreementsRepository as any).manager = manager;

      const mockWorkItems = [{ id: 'w1', agreement_id: 'a1' }];
      (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([mockWorkItems, 1]);

      const result = await service.findWorkItemsForAgreement(
        'a1',
        'em1',
        UserRole.EM,
        1,
        10,
      );

      expect(manager.find).toHaveBeenCalledWith(
        WorkItemEmployeeAssignment,
        expect.objectContaining({
          where: { employee_id: 'em1' },
          select: ['work_item_id'],
        }),
      );
      expect(workItemsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          agreement_id: 'a1',
          id: In(['w1']),
        },
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
        relations: {
          contractor: true,
        },
      });
      expect(result).toEqual({
        data: mockWorkItems,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('returns empty pagination payload for EM role if they have no assignments', async () => {
      const agreement = { id: 'a1', workItems: [] };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);

      const manager = {
        find: jest.fn().mockResolvedValue([]),
      };
      (agreementsRepository as any).manager = manager;

      const result = await service.findWorkItemsForAgreement(
        'a1',
        'em1',
        UserRole.EM,
        1,
        10,
      );

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
      expect(workItemsRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('returns all work items for HO role', async () => {
      const agreement = { id: 'a1', workItems: [] };
      (agreementsRepository.findOne as jest.Mock).mockResolvedValue(agreement);

      const mockWorkItems = [{ id: 'w1', agreement_id: 'a1' }, { id: 'w2', agreement_id: 'a1' }];
      (workItemsRepository.findAndCount as jest.Mock).mockResolvedValue([mockWorkItems, 2]);

      const result = await service.findWorkItemsForAgreement(
        'a1',
        'ho1',
        UserRole.HO,
        2,
        1,
      );

      expect(workItemsRepository.findAndCount).toHaveBeenCalledWith({
        where: { agreement_id: 'a1' },
        skip: 1,
        take: 1,
        order: { created_at: 'DESC' },
        relations: {
          contractor: true,
        },
      });
      expect(result).toEqual({
        data: mockWorkItems,
        total: 2,
        page: 2,
        limit: 1,
        totalPages: 2,
      });
    });
  });
});
