import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { Agreement } from './entities/agreement.entity';

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
  } as const;

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
