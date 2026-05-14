/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
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
import { AttachAgreementFileDto } from './dto/attach-agreement-file.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { AgreementFile } from './entities/agreement-file.entity';
import { AgreementFileMap } from './entities/agreement-file-map.entity';
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
      work_id: 'temp-work-id',
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
          work_id: 'temp-work-id',
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
});
