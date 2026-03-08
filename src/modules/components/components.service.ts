import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { UpdateWorkItemComponentDto } from './dto/update-work-item-component.dto';
import { Component } from './entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from './entities/work-item-component.entity';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(WorkItemComponent)
    private readonly workItemComponentRepo: Repository<WorkItemComponent>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
  ) {}

  async findMasterComponents(): Promise<Component[]> {
    return this.componentRepo.find({
      order: { order_number: 'ASC' },
    });
  }

  async findByWorkItem(workItemId: number): Promise<WorkItemComponent[]> {
    return this.workItemComponentRepo.find({
      where: { work_item_id: workItemId },
      relations: ['component'],
      order: {
        component: {
          order_number: 'ASC',
        },
      },
    });
  }

  async findOneMapping(id: number): Promise<WorkItemComponent> {
    const mapping = await this.workItemComponentRepo.findOne({
      where: { id },
      relations: ['component', 'workItem'],
    });

    if (!mapping) {
      throw new NotFoundException(
        `Work item component mapping with ID ${id} not found`,
      );
    }

    return mapping;
  }

  async updateMapping(
    id: number,
    updateDto: UpdateWorkItemComponentDto,
  ): Promise<WorkItemComponent> {
    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const mapping = await this.findOneMapping(id);
    Object.assign(mapping, updateDto);
    const updated = await this.workItemComponentRepo.save(mapping);

    if (updateDto.status) {
      await this.recalculateProgress(mapping.work_item_id);
    }

    return updated;
  }

  async recalculateProgress(
    workItemId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repositoryManager = manager ?? this.workItemComponentRepo.manager;

    const totalComponents = await repositoryManager.count(WorkItemComponent, {
      where: { work_item_id: workItemId },
    });

    const approvedComponents = await repositoryManager.count(WorkItemComponent, {
      where: {
        work_item_id: workItemId,
        status: WorkItemComponentStatus.APPROVED,
      },
    });

    const progress =
      totalComponents === 0
        ? 0
        : Number(((approvedComponents / totalComponents) * 100).toFixed(2));

    await repositoryManager.update(WorkItem, workItemId, {
      progress_percentage: progress,
    });
  }
}
