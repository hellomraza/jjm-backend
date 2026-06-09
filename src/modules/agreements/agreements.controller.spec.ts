import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { UserRole } from '../users/entities/user.entity';

describe('AgreementsController', () => {
  let controller: AgreementsController;
  const agreementsService = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findOneForUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    attachFileToAgreement: jest.fn(),
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
    const dto = { contractor_id: 'c1', work_ids: ['w1'] } as Parameters<
      AgreementsController['create']
    >[0];
    agreementsService.create.mockResolvedValue({
      id: 'a1',
      agreementno: 'AGR001',
      agreementyear: '2025-2026',
      contractor_id: 'c1',
      contractor: undefined,
      workItems: [],
      agreementFileMaps: [],
      created_at: new Date(),
      updated_at: new Date(),
    });
    await controller.create(dto);
    expect(agreementsService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to service', async () => {
    const req = { user: { userId: 'u1', role: 'HO' } } as any;
    agreementsService.findAllForUser.mockResolvedValue({
      data: [
        {
          id: 'a1',
          agreementno: 'AGR001',
          agreementyear: '2025-2026',
          contractor_id: 'c1',
          contractor: undefined,
          workItems: [],
          agreementFileMaps: [
            {
              agreementFile: {
                id: 'f1',
                file_url: 'https://cdn.example.com/agreement.pdf',
                file_name: 'agreement.pdf',
                mime_type: 'application/pdf',
                file_size: 10,
                uploaded_by_user_id: 'u1',
                uploaded_by_role: UserRole.HO,
                created_at: new Date(),
                updated_at: new Date(),
              },
            },
          ],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    await controller.findAll(req, 1, 20);
    expect(agreementsService.findAllForUser).toHaveBeenCalledWith(
      'u1',
      'HO',
      1,
      20,
      undefined,
      undefined,
    );
  });

  it('findOne returns agreement files in the response payload', async () => {
    const req = { user: { userId: 'u1', role: 'HO' } } as any;
    agreementsService.findOneForUser.mockResolvedValue({
      id: 'a1',
      agreementno: 'AGR001',
      agreementyear: '2025-2026',
      contractor_id: 'c1',
      contractor: undefined,
      workItems: [],
      agreementFileMaps: [
        {
          agreementFile: {
            id: 'f1',
            file_url: 'https://cdn.example.com/agreement.pdf',
            file_name: 'agreement.pdf',
            mime_type: 'application/pdf',
            file_size: 10,
            uploaded_by_user_id: 'u1',
            uploaded_by_role: UserRole.HO,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await controller.findOne(req, 'a1');

    expect(agreementsService.findOneForUser).toHaveBeenCalledWith(
      'a1',
      'u1',
      'HO',
    );
    expect(result.files).toHaveLength(1);
    expect(result.files[0].file_url).toBe(
      'https://cdn.example.com/agreement.pdf',
    );
  });

  it('attachFile uses HO role metadata', async () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AgreementsController.prototype.attachFile),
    ).toEqual([UserRole.HO]);

    agreementsService.attachFileToAgreement.mockResolvedValue({
      agreement: {
        id: 'a1',
        agreementno: 'AGR001',
        agreementyear: '2025-2026',
        contractor_id: 'c1',
        contractor: undefined,
        workItems: [],
        agreementFileMaps: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
      file: {
        id: 'f1',
        file_url: 'https://cdn.example.com/agreement.pdf',
        file_name: 'agreement.pdf',
        mime_type: 'application/pdf',
        file_size: 10,
        uploaded_by_user_id: 'u1',
        uploaded_by_role: UserRole.HO,
        created_at: new Date(),
        updated_at: new Date(),
      },
      mapping: {
        id: 'm1',
        agreement_id: 'a1',
        agreement_file_id: 'f1',
        created_at: new Date(),
        agreementFile: undefined,
      },
    });

    const req = { user: { userId: 'u1', role: UserRole.HO } } as any;
    const result = await controller.attachFile(
      'a1',
      {
        fileUrl: 'https://cdn.example.com/agreement.pdf',
        mimeType: 'application/pdf',
      } as any,
      req,
    );

    expect(agreementsService.attachFileToAgreement).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        fileUrl: 'https://cdn.example.com/agreement.pdf',
      }),
      req.user,
    );
    expect(result.file.file_url).toBe('https://cdn.example.com/agreement.pdf');
  });

  it('remove delegates to service', async () => {
    await controller.remove('a1');
    expect(agreementsService.remove).toHaveBeenCalledWith('a1');
  });
});
