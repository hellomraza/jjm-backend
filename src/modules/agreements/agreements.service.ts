import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import {
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Like,
  Not,
  Repository,
} from 'typeorm';
import {
  Component,
  ComponentType,
} from '../components/entities/component.entity';
import {
  importAgreementMapping,
  type AgreementImport,
} from '../import/import.service';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { WorkOrderTpiAssignment } from '../work-order-tpi/entities/work-order-tpi-assignment.entity';
import {
  WorkItemComponentStatus,
  WorkOrderTpiComponent,
} from '../work-order-tpi/entities/work-order-tpi-component.entity';
import { WorkOrderTpiEmployeeAssignment } from '../work-order-tpi/entities/work-order-tpi-employee-assignment.entity';
import { WorkOrderTpi } from '../work-order-tpi/entities/work-order-tpi.entity';
import { STATIC_TPI_COMPONENTS } from '../work-order-tpi/work-order-tpi.constants';
import { AttachAgreementFileDto } from './dto/attach-agreement-file.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AgreementFileMap } from './entities/agreement-file-map.entity';
import { AgreementFile } from './entities/agreement-file.entity';
import { Agreement } from './entities/agreement.entity';

type AgreementFileAttachmentResult = {
  agreement: Agreement;
  file: AgreementFile;
  mapping: AgreementFileMap;
};

@Injectable()
export class AgreementsService {
  private readonly agreementRelations = {
    contractor: true,
    workItems: {
      district: true,
      block: true,
      panchayat: true,
      village: true,
      subdivision: true,
      circle: true,
      zone: true,
      contractor: true,
    },
    workOrderTpis: {
      district: true,
      block: true,
      panchayat: true,
      village: true,
      subdivision: true,
      circle: true,
      zone: true,
      contractor: true,
    },
    agreementFileMaps: {
      agreementFile: true,
    },
  };

  constructor(
    @InjectRepository(Agreement)
    private readonly agreementsRepository: Repository<Agreement>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
    @InjectRepository(AgreementFile)
    private readonly agreementFilesRepository: Repository<AgreementFile>,
    @InjectRepository(AgreementFileMap)
    private readonly agreementFileMapsRepository: Repository<AgreementFileMap>,
  ) {}

  private resolvePdfMimeType(fileUrl: string, mimeType?: string): string {
    const normalizedMimeType = mimeType?.trim();
    const looksLikePdf = /\.pdf(?:\?.*)?$/i.test(fileUrl);

    if (normalizedMimeType && normalizedMimeType !== 'application/pdf') {
      throw new BadRequestException('mimeType must be application/pdf');
    }

    if (!normalizedMimeType && !looksLikePdf) {
      throw new BadRequestException(
        'mimeType must be application/pdf or the fileUrl must end with .pdf',
      );
    }

    return 'application/pdf';
  }

  private deriveAgreementFileName(fileUrl: string, fileName?: string): string {
    const normalizedName = fileName?.trim();
    if (normalizedName) {
      return normalizedName;
    }

    try {
      const url = new URL(fileUrl);
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      return lastSegment || 'agreement.pdf';
    } catch {
      return 'agreement.pdf';
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      error instanceof Error &&
      /duplicate entry|ER_DUP_ENTRY/i.test(error.message)
    );
  }

  private async validateForeignKeys(
    contractorId?: string | null,
    workIds?: string[] | null,
  ): Promise<void> {
    if (contractorId) {
      const contractor = await this.usersRepository.findOne({
        where: { id: contractorId },
      });

      if (!contractor) {
        throw new UnprocessableEntityException(
          `Contractor user #${contractorId} not found`,
        );
      }
    }

    if (workIds && workIds.length > 0) {
      const workItems = await this.workItemsRepository.find({
        where: { id: In(workIds) },
      });

      if (workItems.length !== workIds.length) {
        throw new UnprocessableEntityException(
          `One or more work items not found`,
        );
      }
    }
  }

  private getCurrentFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
  }

  private async generateAgreementNumber(
    financialYear: string,
  ): Promise<string> {
    const latestAgreement = await this.agreementsRepository.findOne({
      where: { agreementyear: financialYear },
      order: { created_at: 'DESC' },
    });

    const lastSequence = latestAgreement?.agreementno.match(/(\d+)$/)?.[1];
    const nextSequence = lastSequence ? Number(lastSequence) + 1 : 1;
    const paddedSequence = String(nextSequence).padStart(4, '0');

    return `AGR-${financialYear}-${paddedSequence}`;
  }

  private mapImportedAgreement(
    agreementImport: AgreementImport,
  ): Record<string, any> {
    const mappedAgreement: Record<string, any> = {};

    for (const [agreementKey, importKey] of Object.entries(
      importAgreementMapping,
    )) {
      const value = agreementImport[importKey];

      if (value !== undefined) {
        mappedAgreement[agreementKey] = value;
      }
    }

    return mappedAgreement;
  }

  private isTemporaryContractor(contractor: User): boolean {
    return (
      contractor.role === UserRole.CO &&
      contractor.email.startsWith('temp-contractor-') &&
      contractor.email.endsWith('@import.local') &&
      contractor.name.startsWith('Temporary Contractor ')
    );
  }

  private async findOrCreateTemporaryContractor(
    manager: EntityManager,
    contractorCode: string,
  ): Promise<User> {
    const contractor = await manager.findOne(User, {
      where: { code: contractorCode, role: UserRole.CO },
    });

    if (contractor) {
      if (this.isTemporaryContractor(contractor)) {
        const codeHash = createHash('sha256')
          .update(contractorCode)
          .digest('hex')
          .slice(0, 16);

        Object.assign(contractor, {
          email: `temp-contractor-${codeHash}@import.local`,
          password: await bcrypt.hash(`temp-contractor-${codeHash}`, 10),
          name: `Temporary Contractor ${contractorCode}`,
          role: UserRole.CO,
        });

        return manager.save(User, contractor);
      }

      return contractor;
    }

    const existingUserWithCode = await manager.findOne(User, {
      where: { code: contractorCode },
    });

    if (existingUserWithCode) {
      throw new UnprocessableEntityException(
        `User code #${contractorCode} exists but is not a contractor`,
      );
    }

    const codeHash = createHash('sha256')
      .update(contractorCode)
      .digest('hex')
      .slice(0, 16);
    const password = await bcrypt.hash(`temp-contractor-${codeHash}`, 10);
    const temporaryContractor = manager.create(User, {
      code: contractorCode,
      email: `temp-contractor-${codeHash}@import.local`,
      password,
      name: `Temporary Contractor ${contractorCode}`,
      role: UserRole.CO,
    });

    return manager.save(User, temporaryContractor);
  }

  async getWorkItemIdsForContractor(contractorId: string): Promise<string[]> {
    const agreements = await this.agreementsRepository.find({
      where: { contractor_id: contractorId },
      relations: ['workItems', 'workOrderTpis'],
    });

    const agreementWorkItemIds = agreements.flatMap((a) => [
      ...(a.workItems?.map((w) => w.id) || []),
      ...(a.workOrderTpis?.map((w) => w.id) || []),
    ]);

    return Array.from(new Set(agreementWorkItemIds));
  }

  private isTemporaryWorkItem(workItem: WorkItem): boolean {
    return (
      workItem.schemetype === 'TEMP' ||
      workItem.title.startsWith('Temporary Work Item ')
    );
  }

  private isTemporaryWorkOrderTpi(workOrderTpi: WorkOrderTpi): boolean {
    return (
      workOrderTpi.schemetype === 'TEMP' ||
      workOrderTpi.title.startsWith('Temporary Work Order ')
    );
  }

  private async findOrCreateTemporaryWorkItem(
    manager: EntityManager,
    workCode: string,
    contractorId: string,
  ): Promise<WorkItem> {
    const workItem = await manager.findOne(WorkItem, {
      where: { work_code: workCode },
    });

    if (workItem) {
      if (this.isTemporaryWorkItem(workItem)) {
        Object.assign(workItem, {
          title: `Temporary Work Item ${workCode}`,
          description: 'Temporary work item created during agreement import',
          district_id: null,
          schemetype: 'TEMP',
          contractor_id: contractorId,
          latitude: 0,
          longitude: 0,
          progress_percentage: 0,
          status: WorkItemStatus.PENDING,
        });

        return manager.save(WorkItem, workItem);
      }

      return workItem;
    }

    const temporaryWorkItem = manager.create(WorkItem, {
      work_code: workCode,
      title: `Temporary Work Item ${workCode}`,
      description: 'Temporary work item created during agreement import',
      district_id: null,
      schemetype: 'TEMP',
      contractor_id: contractorId,
      latitude: 0,
      longitude: 0,
      progress_percentage: 0,
      status: WorkItemStatus.PENDING,
    });

    return manager.save(WorkItem, temporaryWorkItem);
  }

  private async findOrCreateTemporaryWorkOrderTpi(
    manager: EntityManager,
    workCode: string,
    contractorId: string,
  ): Promise<WorkOrderTpi> {
    const workOrder = await manager.findOne(WorkOrderTpi, {
      where: { work_code: workCode },
    });

    if (workOrder) {
      if (this.isTemporaryWorkOrderTpi(workOrder)) {
        Object.assign(workOrder, {
          title: `Temporary Work Order ${workCode}`,
          description: 'Temporary work order created during agreement import',
          district_id: null,
          schemetype: 'TEMP',
          contractor_id: contractorId,
          latitude: 0,
          longitude: 0,
          progress_percentage: 0,
          status: WorkItemStatus.PENDING,
        });

        return manager.save(WorkOrderTpi, workOrder);
      }

      return workOrder;
    }

    const temporaryWorkOrder = manager.create(WorkOrderTpi, {
      work_code: workCode,
      title: `Temporary Work Order ${workCode}`,
      description: 'Temporary work order created during agreement import',
      district_id: null,
      schemetype: 'TEMP',
      contractor_id: contractorId,
      latitude: 0,
      longitude: 0,
      progress_percentage: 0,
      status: WorkItemStatus.PENDING,
    });

    const savedWorkOrder = await manager.save(WorkOrderTpi, temporaryWorkOrder);

    // Initialize 8 milestone components
    const masterComponents = await manager.find(Component, {
      where: { type: ComponentType.TPI },
      order: { order_number: 'ASC' },
    });

    const componentsToCreate = (
      masterComponents.length > 0 ? masterComponents : STATIC_TPI_COMPONENTS
    ).map((tpl: any) =>
      manager.create(WorkOrderTpiComponent, {
        work_order_tpi_id: savedWorkOrder.id,
        component_id: tpl.id || undefined,
        name: tpl.name,
        unit: tpl.unit,
        order_number: tpl.order_number,
        status: WorkItemComponentStatus.PENDING,
        progress: 0,
      }),
    );
    await manager.save(WorkOrderTpiComponent, componentsToCreate);

    return savedWorkOrder;
  }

  async create(createAgreementDto: CreateAgreementDto): Promise<Agreement> {
    const { work_ids, is_tpi, ...agreementData } = createAgreementDto as any;
    await this.validateForeignKeys(
      createAgreementDto.contractor_id,
      work_ids || [],
    );

    const agreement = this.agreementsRepository.create(
      agreementData as Partial<Agreement>,
    ) as unknown as Agreement;
    const savedAgreement = (await this.agreementsRepository.save(
      agreement,
    )) as unknown as Agreement;

    if (work_ids && work_ids.length > 0) {
      await this.workItemsRepository.update(
        { id: In(work_ids) },
        {
          agreement_id: savedAgreement.id,
          contractor_id: savedAgreement.contractor_id ?? null,
        },
      );
      if (this.agreementsRepository.manager?.update) {
        await this.agreementsRepository.manager.update(
          WorkOrderTpi,
          { id: In(work_ids) },
          {
            agreement_id: savedAgreement.id,
            contractor_id: savedAgreement.contractor_id ?? null,
          },
        );
      }
    } else if (is_tpi || (agreementData as any).schemetype === 'TPI') {
      const workCode =
        savedAgreement.workorderno ||
        `TPI-${savedAgreement.agreementno}` ||
        `TPI-${savedAgreement.id.slice(0, 8)}`;
      if (savedAgreement.contractor_id) {
        const tempTpi = await this.findOrCreateTemporaryWorkOrderTpi(
          this.agreementsRepository.manager,
          workCode,
          savedAgreement.contractor_id,
        );
        tempTpi.agreement_id = savedAgreement.id;
        tempTpi.contractor_id = savedAgreement.contractor_id;
        await this.agreementsRepository.manager.save(WorkOrderTpi, tempTpi);
      }
    }

    return this.findOne(savedAgreement.id);
  }

  async attachFileToAgreement(
    agreementId: string,
    attachAgreementFileDto: AttachAgreementFileDto,
    uploader: { userId: string; role: UserRole },
  ): Promise<AgreementFileAttachmentResult> {
    if (uploader.role !== UserRole.HO) {
      throw new ForbiddenException(
        'Only HO users can attach files to agreements',
      );
    }

    const fileUrl = attachAgreementFileDto.fileUrl.trim();
    const mimeType = this.resolvePdfMimeType(
      fileUrl,
      attachAgreementFileDto.mimeType,
    );

    try {
      return await this.agreementsRepository.manager.transaction(
        async (manager) => {
          const agreement = await manager.findOne(Agreement, {
            where: { id: agreementId },
            relations: this.agreementRelations,
          });

          if (!agreement) {
            throw new NotFoundException(`Agreement #${agreementId} not found`);
          }

          const existingFile = await manager.findOne(AgreementFile, {
            where: { file_url: fileUrl },
          });

          if (existingFile) {
            throw new ConflictException(
              `Agreement file with URL ${fileUrl} already exists`,
            );
          }

          const agreementFile = manager.create(AgreementFile, {
            file_url: fileUrl,
            file_name: this.deriveAgreementFileName(
              fileUrl,
              attachAgreementFileDto.fileName,
            ),
            mime_type: mimeType,
            file_size: attachAgreementFileDto.fileSize ?? null,
            uploaded_by_user_id: uploader.userId,
            uploaded_by_role: uploader.role,
          });

          const savedAgreementFile = await manager.save(
            AgreementFile,
            agreementFile,
          );

          const agreementFileMap = manager.create(AgreementFileMap, {
            agreement_id: agreement.id,
            agreement_file_id: savedAgreementFile.id,
          });

          const savedAgreementFileMap = await manager.save(
            AgreementFileMap,
            agreementFileMap,
          );

          const reloadedAgreement = await manager.findOne(Agreement, {
            where: { id: agreement.id },
            relations: this.agreementRelations,
          });

          if (!reloadedAgreement) {
            throw new NotFoundException(`Agreement #${agreement.id} not found`);
          }

          return {
            agreement: reloadedAgreement,
            file: savedAgreementFile,
            mapping: savedAgreementFileMap,
          };
        },
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Agreement file with URL ${fileUrl} already exists or is already attached`,
        );
      }

      throw error;
    }
  }

  async createWithManager(
    manager: EntityManager,
    createAgreementDto: CreateAgreementDto,
  ): Promise<Agreement> {
    if (createAgreementDto.contractor_id) {
      const contractor = await manager.findOne(User, {
        where: { id: createAgreementDto.contractor_id },
      });

      if (!contractor) {
        throw new UnprocessableEntityException(
          `Contractor user #${createAgreementDto.contractor_id} not found`,
        );
      }
    }

    const { work_ids, ...agreementData } = createAgreementDto;

    if (work_ids && work_ids.length > 0) {
      const workItemsCount = await manager.count(WorkItem, {
        where: { id: In(work_ids) },
      });

      if (workItemsCount !== work_ids.length) {
        throw new UnprocessableEntityException(
          `One or more work items not found`,
        );
      }
    }

    const agreement = manager.create(Agreement, {
      ...agreementData,
    });
    const savedAgreement = await manager.save(Agreement, agreement);

    if (work_ids && work_ids.length > 0) {
      await manager.update(
        WorkItem,
        { id: In(work_ids) },
        {
          agreement_id: savedAgreement.id,
          contractor_id: savedAgreement.contractor_id ?? null,
        },
      );
    }

    const reloadedAgreement = await manager.findOne(Agreement, {
      where: { id: savedAgreement.id },
      relations: this.agreementRelations,
    });

    if (!reloadedAgreement) {
      throw new NotFoundException(`Agreement #${savedAgreement.id} not found`);
    }

    return reloadedAgreement;
  }

  async bulkCreateFromImport(
    agreementImports: AgreementImport[],
    isTpi: boolean = false,
  ): Promise<{
    inserted: Agreement[];
    errors: { index: number; reason: string; item: AgreementImport }[];
  }> {
    const inserted: Agreement[] = [];
    const errors: { index: number; reason: string; item: AgreementImport }[] =
      [];

    const batchAgreementsMap = new Map<string, Agreement>();

    for (let i = 0; i < agreementImports.length; i++) {
      const agreementImport = agreementImports[i];

      try {
        const createdOrUpdatedAgreement =
          await this.agreementsRepository.manager.transaction(
            async (manager) => {
              const mappedAgreement =
                this.mapImportedAgreement(agreementImport);
              const contractorCode = mappedAgreement.contractor_id as
                | string
                | null;
              const workCode = mappedAgreement.work_id as string | null;

              const agreementNoValue = mappedAgreement.agreementno;
              const normalizedAgreementNo =
                agreementNoValue === null || agreementNoValue === undefined
                  ? null
                  : String(agreementNoValue).trim() || null;

              const agreementYearValue = mappedAgreement.agreementyear;
              const normalizedAgreementYear =
                agreementYearValue === null || agreementYearValue === undefined
                  ? null
                  : String(agreementYearValue).trim() || null;

              if (!contractorCode) {
                throw new UnprocessableEntityException(
                  'contractor_code is required for agreement import',
                );
              }

              if (!workCode) {
                throw new UnprocessableEntityException(
                  'workcode is required for agreement import',
                );
              }

              if (!normalizedAgreementNo) {
                throw new UnprocessableEntityException(
                  'agreementno is required for agreement import',
                );
              }

              if (!normalizedAgreementYear) {
                throw new UnprocessableEntityException(
                  'agreementyear is required for agreement import',
                );
              }

              const contractor = await this.findOrCreateTemporaryContractor(
                manager,
                contractorCode,
              );

              let workItem: WorkItem | null = null;
              let workOrderTpi: WorkOrderTpi | null = null;

              if (isTpi) {
                workOrderTpi = await this.findOrCreateTemporaryWorkOrderTpi(
                  manager,
                  workCode,
                  contractor.id,
                );
              } else {
                workItem = await this.findOrCreateTemporaryWorkItem(
                  manager,
                  workCode,
                  contractor.id,
                );
              }

              const compositeBatchKey = `${normalizedAgreementNo.toLowerCase()}|${normalizedAgreementYear.toLowerCase()}|${contractor.id}`;
              let agreement: Agreement | null | undefined =
                batchAgreementsMap.get(compositeBatchKey);

              if (!agreement) {
                agreement = await manager.findOne(Agreement, {
                  where: {
                    agreementno: normalizedAgreementNo,
                    agreementyear: normalizedAgreementYear,
                    contractor_id: contractor.id,
                  },
                });
              }

              if (agreement) {
                const updateData: Partial<Agreement> = {};
                const workOrderValue = mappedAgreement.workorderno;

                if (workOrderValue !== undefined && workOrderValue !== null) {
                  updateData.workorderno =
                    String(workOrderValue).trim() || null;
                }
                if (
                  mappedAgreement.workorderdate !== undefined &&
                  mappedAgreement.workorderdate !== null
                ) {
                  updateData.workorderdate = mappedAgreement.workorderdate;
                }
                if (
                  mappedAgreement.dispatch_no !== undefined &&
                  mappedAgreement.dispatch_no !== null
                ) {
                  updateData.dispatch_no = mappedAgreement.dispatch_no;
                }
                if (
                  mappedAgreement.dispatch_date !== undefined &&
                  mappedAgreement.dispatch_date !== null
                ) {
                  updateData.dispatch_date = mappedAgreement.dispatch_date;
                }
                if (
                  mappedAgreement.already_sent !== undefined &&
                  mappedAgreement.already_sent !== null
                ) {
                  updateData.already_sent = mappedAgreement.already_sent;
                }
                if (
                  mappedAgreement.sr !== undefined &&
                  mappedAgreement.sr !== null
                ) {
                  updateData.sr = mappedAgreement.sr;
                }
                if (
                  mappedAgreement.excel !== undefined &&
                  mappedAgreement.excel !== null
                ) {
                  updateData.excel = mappedAgreement.excel;
                }
                if (
                  mappedAgreement.unitag !== undefined &&
                  mappedAgreement.unitag !== null
                ) {
                  updateData.unitag = mappedAgreement.unitag;
                }
                if (
                  mappedAgreement.agrid !== undefined &&
                  mappedAgreement.agrid !== null
                ) {
                  updateData.agrid = String(mappedAgreement.agrid);
                }
                if (
                  mappedAgreement.division_code !== undefined &&
                  mappedAgreement.division_code !== null
                ) {
                  updateData.division_code = mappedAgreement.division_code;
                }

                if (Object.keys(updateData).length > 0) {
                  Object.assign(agreement, updateData);
                  await manager.save(Agreement, agreement);
                }

                if (workItem) {
                  workItem.agreement_id = agreement.id;
                  workItem.contractor_id = agreement.contractor_id ?? null;
                  await manager.save(WorkItem, workItem);
                }
                if (workOrderTpi) {
                  workOrderTpi.agreement_id = agreement.id;
                  workOrderTpi.contractor_id = agreement.contractor_id ?? null;
                  await manager.save(WorkOrderTpi, workOrderTpi);
                }
              } else {
                const workOrderValue = mappedAgreement.workorderno;
                const normalizedWorkOrder =
                  workOrderValue === null || workOrderValue === undefined
                    ? null
                    : String(workOrderValue).trim() || null;

                const newAgreement = manager.create(Agreement, {
                  agreementno: normalizedAgreementNo,
                  agreementyear: normalizedAgreementYear,
                  contractor_id: contractor.id,
                  workorderno: normalizedWorkOrder,
                  workorderdate: mappedAgreement.workorderdate ?? null,
                  dispatch_no: mappedAgreement.dispatch_no ?? null,
                  dispatch_date: mappedAgreement.dispatch_date ?? null,
                  already_sent: mappedAgreement.already_sent ?? null,
                  sr: mappedAgreement.sr ?? null,
                  excel: mappedAgreement.excel ?? null,
                  unitag: mappedAgreement.unitag ?? null,
                  agrid:
                    mappedAgreement.agrid === null ||
                    mappedAgreement.agrid === undefined
                      ? null
                      : String(mappedAgreement.agrid),
                  division_code: mappedAgreement.division_code ?? null,
                } as Partial<Agreement>);

                agreement = await manager.save(Agreement, newAgreement);

                if (workItem) {
                  workItem.agreement_id = agreement.id;
                  workItem.contractor_id = agreement.contractor_id ?? null;
                  await manager.save(WorkItem, workItem);
                }
                if (workOrderTpi) {
                  workOrderTpi.agreement_id = agreement.id;
                  workOrderTpi.contractor_id = agreement.contractor_id ?? null;
                  await manager.save(WorkOrderTpi, workOrderTpi);
                }
              }

              const reloadedAgreement = await manager.findOne(Agreement, {
                where: { id: agreement.id },
                relations: this.agreementRelations,
              });

              if (!reloadedAgreement) {
                throw new NotFoundException(
                  `Agreement #${agreement.id} not found`,
                );
              }

              batchAgreementsMap.set(compositeBatchKey, reloadedAgreement);
              return reloadedAgreement;
            },
          );

        inserted.push(createdOrUpdatedAgreement);
      } catch (err) {
        errors.push({
          index: i,
          reason: err instanceof Error ? err.message : String(err),
          item: agreementImport,
        });
      }
    }

    return { inserted, errors };
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Agreement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    const [items, total] = await this.agreementsRepository.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: this.agreementRelations,
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private async getAccessWhereClause(
    userId: string,
    role: UserRole,
  ): Promise<FindOptionsWhere<Agreement> | undefined> {
    if (role === UserRole.HO) {
      return undefined;
    }

    if (role === UserRole.CO) {
      return { contractor_id: userId };
    }

    if (role === UserRole.DO) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user?.district_id) {
        return { id: '__no_access__' };
      }

      return { workItems: { district_id: user.district_id } };
    }

    if (role === UserRole.EM) {
      const assignments = await this.agreementsRepository.manager.find(
        WorkItemEmployeeAssignment,
        {
          where: { employee_id: userId },
          select: ['work_item_id'],
        },
      );
      const workItemIds = assignments.map((a) => a.work_item_id);

      let tpiWorkOrderIds: string[] = [];
      if (this.agreementsRepository.manager?.find) {
        try {
          const tpiAssignments = await this.agreementsRepository.manager.find(
            WorkOrderTpiEmployeeAssignment,
            {
              where: { employee_id: userId },
              select: ['work_order_tpi_id'],
            },
          );
          tpiWorkOrderIds = tpiAssignments.map((a) => a.work_order_tpi_id);
        } catch {
          tpiWorkOrderIds = [];
        }
      }

      if (workItemIds.length === 0 && tpiWorkOrderIds.length === 0) {
        return { id: '__no_access__' };
      }

      if (workItemIds.length > 0 && tpiWorkOrderIds.length === 0) {
        return { workItems: { id: In(workItemIds) } };
      }

      if (tpiWorkOrderIds.length > 0 && workItemIds.length === 0) {
        return { workOrderTpis: { id: In(tpiWorkOrderIds) } };
      }

      return {
        workItems: { id: In(workItemIds) },
        workOrderTpis: { id: In(tpiWorkOrderIds) },
      } as any;
    }

    if (role === UserRole.TPI) {
      const assignments = await this.agreementsRepository.manager.find(
        WorkOrderTpiAssignment,
        {
          where: { tpi_id: userId },
          select: ['work_order_tpi_id'],
        },
      );
      const tpiWorkOrderIds = assignments.map((a) => a.work_order_tpi_id);
      if (tpiWorkOrderIds.length === 0) {
        return { id: '__no_access__' };
      }

      return { workOrderTpis: { id: In(tpiWorkOrderIds) } };
    }

    return { id: '__no_access__' };
  }

  async findAllForUser(
    userId: string,
    role: UserRole,
    page: number = 1,
    limit: number = 20,
    search?: string,
    agreementyear?: string,
    mode?: string,
  ): Promise<{
    data: Agreement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    const isTpiMode = mode === 'tpi' || mode === 'ee';
    const isSvsMode = mode === 'svs' || mode === 'do';

    const where: FindOptionsWhere<Agreement> = {};
    const accessWhere = await this.getAccessWhereClause(userId, role);

    if (accessWhere) {
      Object.assign(where, accessWhere);
    }

    if (search) {
      where.agreementno = Like(`%${search}%`);
    }

    if (agreementyear) {
      where.agreementyear = agreementyear;
    }

    if (isTpiMode) {
      if (role === UserRole.DO) {
        const user = await this.usersRepository.findOne({
          where: { id: userId },
        });
        if (user?.district_id) {
          where.workOrderTpis = { district_id: user.district_id };
        } else {
          where.id = '__no_access__';
        }
      } else if (role !== UserRole.CO) {
        where.workOrderTpis = { id: Not(IsNull()) };
      }
    } else if (isSvsMode && role !== UserRole.DO && role !== UserRole.EM && role !== UserRole.CO) {
      where.workItems = { id: Not(IsNull()) };
    }

    const [items, total] = await this.agreementsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: this.agreementRelations,
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findOneForUser(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<Agreement> {
    const where = await this.getAccessWhereClause(userId, role);

    const agreement = await this.agreementsRepository.findOne({
      where: where ? { ...where, id } : { id },
      relations: this.agreementRelations,
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement #${id} not found`);
    }

    return agreement;
  }

  async findWorkItemsForAgreement(
    agreementId: string,
    userId: string,
    role: UserRole,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: WorkItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    // 1. Verify access to the agreement
    await this.findOneForUser(agreementId, userId, role);

    let where: FindOptionsWhere<WorkItem> = { agreement_id: agreementId };
    let tpiWorkOrderIds: string[] | null = null;

    // 2. Query work items based on role
    if (role === UserRole.EM) {
      const assignments = await this.agreementsRepository.manager.find(
        WorkItemEmployeeAssignment,
        {
          where: { employee_id: userId },
          select: ['work_item_id'],
        },
      );
      const workItemIds = assignments.map((a) => a.work_item_id);

      const tpiAssignments = await this.agreementsRepository.manager.find(
        WorkOrderTpiEmployeeAssignment,
        {
          where: { employee_id: userId },
          select: ['work_order_tpi_id'],
        },
      );
      tpiWorkOrderIds = tpiAssignments.map((a) => a.work_order_tpi_id);

      if (workItemIds.length === 0 && tpiWorkOrderIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        };
      }

      where = {
        agreement_id: agreementId,
        id: In(workItemIds.length > 0 ? workItemIds : ['__no_id__']),
      };
    }

    const [items, totalItems] = await this.workItemsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: {
        contractor: true,
      },
    });

    if (totalItems > 0) {
      return {
        data: items,
        total: totalItems,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalItems / safeLimit),
      };
    }

    let tpiWhere: FindOptionsWhere<WorkOrderTpi> = {
      agreement_id: agreementId,
    };
    if (role === UserRole.EM && tpiWorkOrderIds) {
      tpiWhere = {
        agreement_id: agreementId,
        id: In(tpiWorkOrderIds.length > 0 ? tpiWorkOrderIds : ['__no_id__']),
      };
    }

    let tpiOrders: any[] = [];
    let totalTpi = 0;
    if (this.agreementsRepository.manager?.findAndCount) {
      try {
        [tpiOrders, totalTpi] =
          await this.agreementsRepository.manager.findAndCount(WorkOrderTpi, {
            where: tpiWhere,
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
            order: { created_at: 'DESC' },
            relations: [
              'contractor',
              'district',
              'block',
              'panchayat',
              'village',
            ],
          });
      } catch {
        tpiOrders = [];
        totalTpi = 0;
      }
    }

    return {
      data: tpiOrders as unknown as WorkItem[],
      total: totalTpi,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(totalTpi / safeLimit),
    };
  }

  async findOne(id: string): Promise<Agreement> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id },
      relations: this.agreementRelations,
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement #${id} not found`);
    }

    return agreement;
  }

  async update(
    id: string,
    updateAgreementDto: UpdateAgreementDto,
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    let isContractorChanged = false;
    if (updateAgreementDto.hasOwnProperty('contractor_id')) {
      const newContractorId = updateAgreementDto.contractor_id
        ? updateAgreementDto.contractor_id
        : null;
      if (newContractorId !== agreement.contractor_id) {
        if (newContractorId) {
          await this.validateForeignKeys(newContractorId, []);
        }
        agreement.contractor_id = newContractorId;
        agreement.contractor = newContractorId
          ? ({ id: newContractorId } as User)
          : null;
        isContractorChanged = true;
      }
    }

    const { work_ids, ...updateData } = updateAgreementDto;

    if (work_ids) {
      const currentWorkItemIds =
        agreement.workItems?.map((item) => item.id) || [];

      // 1. Identify removed work items
      const removedIds = currentWorkItemIds.filter(
        (id) => !work_ids.includes(id),
      );
      if (removedIds.length > 0) {
        // Set agreement_id and contractor_id to null for removed work items
        await this.workItemsRepository.update(
          { id: In(removedIds) },
          { agreement_id: null, contractor_id: null },
        );
        // Sync in-memory relation array to remove these work items
        agreement.workItems =
          agreement.workItems?.filter(
            (item) => !removedIds.includes(item.id),
          ) || [];
      }

      // 2. Newly added work orders must not have any agreement ID assigned already
      const addedWorkIds = work_ids.filter(
        (id) => !currentWorkItemIds.includes(id),
      );
      if (addedWorkIds.length > 0) {
        await this.validateForeignKeys(agreement.contractor_id, addedWorkIds);

        const addedWorkItems = await this.workItemsRepository.find({
          where: { id: In(addedWorkIds) },
        });

        for (const workItem of addedWorkItems) {
          if (workItem.agreement_id && workItem.agreement_id !== agreement.id) {
            throw new BadRequestException(
              `Work item #${workItem.id} already has an agreement assigned`,
            );
          }
        }

        // Link newly added work items to the agreement and contractor
        await this.workItemsRepository.update(
          { id: In(addedWorkIds) },
          {
            agreement_id: agreement.id,
            contractor_id: agreement.contractor_id ?? null,
          },
        );

        // Sync in-memory relation array to include added work items
        if (!agreement.workItems) {
          agreement.workItems = [];
        }
        agreement.workItems.push(...addedWorkItems);
      }
    }

    // Exclude contractor_id from updateData because it's handled separately
    const { contractor_id, ...remainingUpdateData } = updateData as any;
    Object.assign(agreement, remainingUpdateData);
    const updatedAgreement = await this.agreementsRepository.save(agreement);

    // If contractor_id changed, propagate it to all work items currently in this agreement
    if (isContractorChanged) {
      await this.workItemsRepository.update(
        { agreement_id: agreement.id },
        { contractor_id: updatedAgreement.contractor_id },
      );
    }

    return this.findOne(updatedAgreement.id);
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.findOne(id);
    // Before removing, nullify agreement_id and contractor_id on all of its work items
    await this.workItemsRepository.update(
      { agreement_id: agreement.id },
      { agreement_id: null, contractor_id: null },
    );
    await this.agreementsRepository.remove(agreement);
  }
}
