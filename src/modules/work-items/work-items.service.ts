import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { WorkItem, WorkItemStatus } from './entities/work-item.entity';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
  ) {}

  async create(createWorkItemDto: CreateWorkItemDto): Promise<WorkItem> {
    const workItem = this.workItemsRepository.create({
      ...createWorkItemDto,
      progress_percentage: createWorkItemDto.progress_percentage ?? 0,
      status: createWorkItemDto.status ?? WorkItemStatus.PENDING,
    });

    return this.workItemsRepository.save(workItem);
  }

  async findAll(
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

    const [items, total] = await this.workItemsRepository.findAndCount({
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

  async findOne(id: number): Promise<WorkItem> {
    const workItem = await this.workItemsRepository.findOne({ where: { id } });
    if (!workItem) {
      throw new NotFoundException(`Work item #${id} not found`);
    }

    return workItem;
  }

  async update(
    id: number,
    updateWorkItemDto: UpdateWorkItemDto,
  ): Promise<WorkItem> {
    const workItem = await this.findOne(id);
    Object.assign(workItem, updateWorkItemDto);
    return this.workItemsRepository.save(workItem);
  }

  async updateStatus(id: number, status: WorkItemStatus): Promise<WorkItem> {
    const workItem = await this.findOne(id);
    workItem.status = status;

    if (status === WorkItemStatus.COMPLETED) {
      workItem.progress_percentage = 100;
    }

    if (status === WorkItemStatus.PENDING && workItem.progress_percentage > 0) {
      workItem.progress_percentage = 0;
    }

    return this.workItemsRepository.save(workItem);
  }

  async remove(id: number): Promise<void> {
    const workItem = await this.findOne(id);
    await this.workItemsRepository.remove(workItem);
  }
}
