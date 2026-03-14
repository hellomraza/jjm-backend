import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
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

  async create(createAgreementDto: CreateAgreementDto): Promise<Agreement> {
    await this.validateForeignKeys(
      createAgreementDto.contractor_id,
      createAgreementDto.work_id,
    );

    const agreement = this.agreementsRepository.create(createAgreementDto);
    return this.agreementsRepository.save(agreement);
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
    return this.agreementsRepository.save(agreement);
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.findOne(id);
    await this.agreementsRepository.remove(agreement);
  }
}
