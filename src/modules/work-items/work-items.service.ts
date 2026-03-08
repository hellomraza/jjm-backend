import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Component } from '../components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../components/entities/work-item-component.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { WorkItem, WorkItemStatus } from './entities/work-item.entity';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemsRepository: Repository<WorkItem>,
    @InjectRepository(Component)
    private readonly componentsRepository: Repository<Component>,
    @InjectRepository(WorkItemComponent)
    private readonly workItemComponentsRepository: Repository<WorkItemComponent>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createWorkItemDto: CreateWorkItemDto): Promise<WorkItem> {
    return this.dataSource.transaction(async (manager) => {
      const masterComponents = await manager.find(Component, {
        order: { order_number: 'ASC' },
      });

      if (masterComponents.length !== 12) {
        throw new NotFoundException(
          `Expected 12 static components, found ${masterComponents.length}`,
        );
      }

      const workItem = manager.create(WorkItem, {
        ...createWorkItemDto,
        progress_percentage: createWorkItemDto.progress_percentage ?? 0,
        status: createWorkItemDto.status ?? WorkItemStatus.PENDING,
      });

      const savedWorkItem = await manager.save(WorkItem, workItem);

      const mappings = masterComponents.map((component) => {
        const mapping = new WorkItemComponent();
        mapping.work_item_id = savedWorkItem.id;
        mapping.component_id = component.id;
        mapping.quantity = undefined;
        mapping.remarks = undefined;
        mapping.status = WorkItemComponentStatus.PENDING;
        return mapping;
      });

      await manager.save(WorkItemComponent, mappings);
      return savedWorkItem;
    });
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

  async findOne(id: string): Promise<WorkItem> {
    const workItem = await this.workItemsRepository.findOne({ where: { id } });
    if (!workItem) {
      throw new NotFoundException(`Work item #${id} not found`);
    }

    return workItem;
  }

  async update(
    id: string,
    updateWorkItemDto: UpdateWorkItemDto,
  ): Promise<WorkItem> {
    const workItem = await this.findOne(id);
    Object.assign(workItem, updateWorkItemDto);
    return this.workItemsRepository.save(workItem);
  }

  async updateStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
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

  async remove(id: string): Promise<void> {
    const workItem = await this.findOne(id);
    await this.workItemsRepository.remove(workItem);
  }
}
