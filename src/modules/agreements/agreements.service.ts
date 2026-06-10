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
  importAgreementMapping,
  type AgreementImport,
} from '../import/import.service';
import { User, UserRole } from '../users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../work-items/entities/work-item.entity';
import { AttachAgreementFileDto } from './dto/attach-agreement-file.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { AgreementFile } from './entities/agreement-file.entity';
import { AgreementFileMap } from './entities/agreement-file-map.entity';
import { Agreement } from './entities/agreement.entity';

type AgreementFileAttachmentResult = {
  agreement: Agreement;
  file: AgreementFile;
  mapping: AgreementFileMap;
};

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private readonly agreementsRepository: Repository<Agreement>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
  ) {}

  private readonly agreementRelations = {
    contractor: true,
    workItems: true,
    agreementFileMaps: {
      agreementFile: true,
    },
  } as const;

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
    const workItems = await this.workItemsRepository.find({
      where: { contractor_id: contractorId, agreement_id: Not(IsNull()) },
      select: ['id'],
    });

    return workItems.map((item) => item.id);
  }

  private isTemporaryWorkItem(workItem: WorkItem): boolean {
    return (
      workItem.schemetype === 'TEMP' ||
      workItem.title.startsWith('Temporary Work Item ')
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

  async create(createAgreementDto: CreateAgreementDto): Promise<Agreement> {
    const { work_ids, ...agreementData } = createAgreementDto;
    await this.validateForeignKeys(
      createAgreementDto.contractor_id,
      work_ids || [],
    );

    const agreement = this.agreementsRepository.create({
      ...agreementData,
    });
    const savedAgreement = await this.agreementsRepository.save(agreement);

    if (work_ids && work_ids.length > 0) {
      await this.workItemsRepository.update(
        { id: In(work_ids) },
        {
          agreement_id: savedAgreement.id,
          contractor_id: savedAgreement.contractor_id ?? null,
        },
      );
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

  async bulkCreateFromImport(agreementImports: AgreementImport[]): Promise<{
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

              const contractor = await this.findOrCreateTemporaryContractor(
                manager,
                contractorCode,
              );

              const workItem = await this.findOrCreateTemporaryWorkItem(
                manager,
                workCode,
                contractor.id,
              );

              const agreementNoKey = normalizedAgreementNo.toLowerCase();
              let agreement: Agreement | null | undefined =
                batchAgreementsMap.get(agreementNoKey);

              if (!agreement) {
                agreement = await manager.findOne(Agreement, {
                  where: { agreementno: normalizedAgreementNo },
                });
              }

              if (agreement) {
                workItem.agreement_id = agreement.id;
                workItem.contractor_id = agreement.contractor_id ?? null;
                await manager.save(WorkItem, workItem);
              } else {
                const workOrderValue = mappedAgreement.workorderno;
                const normalizedWorkOrder =
                  workOrderValue === null || workOrderValue === undefined
                    ? null
                    : String(workOrderValue).trim() || null;

                const newAgreement = manager.create(Agreement, {
                  agreementno: normalizedAgreementNo,
                  agreementyear: mappedAgreement.agreementyear as string,
                  contractor_id: contractor.id,
                  workorderno: normalizedWorkOrder,
                  workorderdate: mappedAgreement.workorderdate ?? null,
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

                workItem.agreement_id = agreement.id;
                workItem.contractor_id = agreement.contractor_id ?? null;
                await manager.save(WorkItem, workItem);
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

              batchAgreementsMap.set(agreementNoKey, reloadedAgreement);
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
      if (workItemIds.length === 0) {
        return { id: '__no_access__' };
      }

      return { workItems: { id: In(workItemIds) } };
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
  ): Promise<{
    data: Agreement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

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
      if (workItemIds.length === 0) {
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
        id: In(workItemIds),
      };
    }

    const [items, total] = await this.workItemsRepository.findAndCount({
      where,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { created_at: 'DESC' },
      relations: {
        contractor: true,
      },
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
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
      const newContractorId = updateAgreementDto.contractor_id ? updateAgreementDto.contractor_id : null;
      if (newContractorId !== agreement.contractor_id) {
        if (newContractorId) {
          await this.validateForeignKeys(newContractorId, []);
        }
        agreement.contractor_id = newContractorId;
        agreement.contractor = newContractorId ? { id: newContractorId } as User : null;
        isContractorChanged = true;
      }
    }

    const { work_ids, ...updateData } = updateAgreementDto;

    if (work_ids) {
      const currentWorkItemIds = agreement.workItems?.map((item) => item.id) || [];

      // 1. Identify removed work items
      const removedIds = currentWorkItemIds.filter((id) => !work_ids.includes(id));
      if (removedIds.length > 0) {
        // Set agreement_id and contractor_id to null for removed work items
        await this.workItemsRepository.update(
          { id: In(removedIds) },
          { agreement_id: null, contractor_id: null }
        );
        // Sync in-memory relation array to remove these work items
        agreement.workItems = agreement.workItems?.filter((item) => !removedIds.includes(item.id)) || [];
      }

      // 2. Newly added work orders must not have any agreement ID assigned already
      const addedWorkIds = work_ids.filter((id) => !currentWorkItemIds.includes(id));
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
      { agreement_id: null, contractor_id: null }
    );
    await this.agreementsRepository.remove(agreement);
  }
}
