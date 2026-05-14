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
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
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
    work: true,
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
    contractorId: string,
    workId: string,
  ): Promise<void> {
    const contractor = await this.usersRepository.findOne({
      where: { id: contractorId },
    });

    if (!contractor) {
      throw new UnprocessableEntityException(
        `Contractor user #${contractorId} not found`,
      );
    }

    const workItem = await this.workItemsRepository.findOne({
      where: { id: workId },
    });

    if (!workItem) {
      throw new UnprocessableEntityException(`Work item #${workId} not found`);
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
  ): Partial<Agreement> {
    const mappedAgreement: Record<string, unknown> = {};

    for (const [agreementKey, importKey] of Object.entries(
      importAgreementMapping,
    ) as Array<[keyof Agreement, keyof AgreementImport]>) {
      const value = agreementImport[importKey];

      if (value !== undefined) {
        mappedAgreement[agreementKey as string] = value;
      }
    }

    return mappedAgreement as Partial<Agreement>;
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
      select: ['work_id'],
    });

    return agreements.map((agreement) => agreement.work_id);
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
    await this.validateForeignKeys(
      createAgreementDto.contractor_id,
      createAgreementDto.work_id,
    );

    const agreementyear = this.getCurrentFinancialYear();
    const agreementno = await this.generateAgreementNumber(agreementyear);

    const agreement = this.agreementsRepository.create({
      ...createAgreementDto,
      agreementno,
      agreementyear,
    });
    const savedAgreement = await this.agreementsRepository.save(agreement);
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
    const contractor = await manager.findOne(User, {
      where: { id: createAgreementDto.contractor_id },
    });

    if (!contractor) {
      throw new UnprocessableEntityException(
        `Contractor user #${createAgreementDto.contractor_id} not found`,
      );
    }

    const workItem = await manager.findOne(WorkItem, {
      where: { id: createAgreementDto.work_id },
    });

    if (!workItem) {
      throw new UnprocessableEntityException(
        `Work item #${createAgreementDto.work_id} not found`,
      );
    }

    const agreementyear = this.getCurrentFinancialYear();
    const latestAgreement = await manager.findOne(Agreement, {
      where: { agreementyear },
      order: { created_at: 'DESC' },
    });

    const lastSequence = latestAgreement?.agreementno.match(/(\d+)$/)?.[1];
    const nextSequence = lastSequence ? Number(lastSequence) + 1 : 1;
    const paddedSequence = String(nextSequence).padStart(4, '0');
    const agreementno = `AGR-${agreementyear}-${paddedSequence}`;

    const agreement = manager.create(Agreement, {
      ...createAgreementDto,
      agreementno,
      agreementyear,
    });
    const savedAgreement = await manager.save(Agreement, agreement);

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
    const seenWorkOrders = new Set<string>();

    for (let i = 0; i < agreementImports.length; i++) {
      const agreementImport = agreementImports[i];

      try {
        const createdAgreement =
          await this.agreementsRepository.manager.transaction(
            async (manager) => {
              const mappedAgreement =
                this.mapImportedAgreement(agreementImport);
              const contractorCode = mappedAgreement.contractor_id as
                | string
                | null;
              const workCode = mappedAgreement.work_id as string | null;

              const workOrderValue = mappedAgreement.workorderno;
              const normalizedWorkOrder =
                workOrderValue === null || workOrderValue === undefined
                  ? null
                  : String(workOrderValue).trim() || null;

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

              if (normalizedWorkOrder) {
                const workOrderKey = normalizedWorkOrder.toLowerCase();
                if (seenWorkOrders.has(workOrderKey)) {
                  throw new UnprocessableEntityException(
                    `Agreement with work order #${normalizedWorkOrder} appears multiple times in import payload`,
                  );
                }

                const existingAgreement = await manager.findOne(Agreement, {
                  where: { workorderno: normalizedWorkOrder },
                  select: ['id'],
                });

                if (existingAgreement) {
                  throw new UnprocessableEntityException(
                    `Agreement with work order #${normalizedWorkOrder} already exists`,
                  );
                }
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

              const agreement = manager.create(Agreement, {
                agreementno: mappedAgreement.agreementno as string,
                agreementyear: mappedAgreement.agreementyear as string,
                contractor_id: contractor.id,
                work_id: workItem.id,
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

              const savedAgreement = await manager.save(Agreement, agreement);
              const reloadedAgreement = await manager.findOne(Agreement, {
                where: { id: savedAgreement.id },
                relations: this.agreementRelations,
              });

              if (!reloadedAgreement) {
                throw new NotFoundException(
                  `Agreement #${savedAgreement.id} not found`,
                );
              }

              if (normalizedWorkOrder) {
                seenWorkOrders.add(normalizedWorkOrder.toLowerCase());
              }

              return reloadedAgreement;
            },
          );

        inserted.push(createdAgreement);
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

      return { work: { district_id: user.district_id } };
    }

    return { id: '__no_access__' };
  }

  async findAllForUser(
    userId: string,
    role: UserRole,
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
    const where = await this.getAccessWhereClause(userId, role);

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

    const contractorId =
      updateAgreementDto.contractor_id ?? agreement.contractor_id;
    const workId = updateAgreementDto.work_id ?? agreement.work_id;
    await this.validateForeignKeys(contractorId, workId);

    Object.assign(agreement, updateAgreementDto);
    const updatedAgreement = await this.agreementsRepository.save(agreement);
    return this.findOne(updatedAgreement.id);
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.findOne(id);
    await this.agreementsRepository.remove(agreement);
  }
}
