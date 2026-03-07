import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { Component, ComponentStatus } from './entities/component.entity';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private componentRepo: Repository<Component>,
    @InjectRepository(WorkItem)
    private workItemRepo: Repository<WorkItem>,
    private dataSource: DataSource,
  ) {}

  private async recalculateProgress(
    workItemId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repositoryManager = manager ?? this.componentRepo.manager;

    const totalComponents = await repositoryManager.count(Component, {
      where: { work_item_id: workItemId },
    });

    const approvedComponents = await repositoryManager.count(Component, {
      where: { work_item_id: workItemId, status: ComponentStatus.APPROVED },
    });

    const progress =
      totalComponents === 0
        ? 0
        : Number(((approvedComponents / totalComponents) * 100).toFixed(2));

    await repositoryManager.update(WorkItem, workItemId, {
      progress_percentage: progress,
    });
  }

  async create(createComponentDto: CreateComponentDto): Promise<Component> {
    const component = this.componentRepo.create(createComponentDto);
    return await this.componentRepo.save(component);
  }

  async findAll(): Promise<Component[]> {
    return await this.componentRepo.find({
      relations: ['workItem', 'approver'],
    });
  }

  async findByWorkItem(workItemId: number): Promise<Component[]> {
    return await this.componentRepo.find({
      where: { work_item_id: workItemId },
      order: { component_number: 'ASC' },
      relations: ['workItem', 'approver'],
    });
  }

  async findOne(id: number): Promise<Component> {
    const component = await this.componentRepo.findOne({
      where: { id },
      relations: ['workItem', 'approver'],
    });

    if (!component) {
      throw new NotFoundException(`Component with ID ${id} not found`);
    }

    return component;
  }

  async update(
    id: number,
    updateComponentDto: UpdateComponentDto,
  ): Promise<Component> {
    const component = await this.findOne(id);
    Object.assign(component, updateComponentDto);
    return await this.componentRepo.save(component);
  }

  async remove(id: number): Promise<void> {
    const component = await this.findOne(id);
    await this.componentRepo.remove(component);
  }

  /**
   * Sequential Approval Rule:
   * Component N+1 CANNOT start before Component N is approved.
   */
  async startComponent(id: number): Promise<Component> {
    const component = await this.findOne(id);

    // If this is not the first component, check if previous is approved
    if (component.component_number > 1) {
      const previousComponent = await this.componentRepo.findOne({
        where: {
          work_item_id: component.work_item_id,
          component_number: component.component_number - 1,
        },
      });

      if (
        !previousComponent ||
        previousComponent.status !== ComponentStatus.APPROVED
      ) {
        throw new BadRequestException(
          `Component ${component.component_number - 1} must be approved before starting Component ${component.component_number}`,
        );
      }
    }

    // Proceed to start the component
    component.status = ComponentStatus.IN_PROGRESS;
    return await this.componentRepo.save(component);
  }

  async approveComponent(id: number, userId: number): Promise<Component> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const component = await queryRunner.manager.findOne(Component, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!component) {
        throw new NotFoundException(`Component with ID ${id} not found`);
      }

      if (component.status === ComponentStatus.APPROVED) {
        throw new ConflictException('Component already approved');
      }

      if (component.status !== ComponentStatus.IN_PROGRESS) {
        throw new BadRequestException(
          'Only IN_PROGRESS components can be approved',
        );
      }

      component.status = ComponentStatus.APPROVED;
      component.approved_by = userId;
      component.approved_at = new Date();

      const savedComponent = await queryRunner.manager.save(
        Component,
        component,
      );
      await this.recalculateProgress(
        component.work_item_id,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return savedComponent;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectComponent(id: number, userId: number): Promise<Component> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const component = await queryRunner.manager.findOne(Component, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!component) {
        throw new NotFoundException(`Component with ID ${id} not found`);
      }

      if (component.status === ComponentStatus.REJECTED) {
        throw new ConflictException('Component already rejected');
      }

      if (component.status !== ComponentStatus.IN_PROGRESS) {
        throw new BadRequestException(
          'Only IN_PROGRESS components can be rejected',
        );
      }

      component.status = ComponentStatus.REJECTED;
      component.approved_by = userId;
      component.approved_at = new Date();

      const savedComponent = await queryRunner.manager.save(
        Component,
        component,
      );
      await this.recalculateProgress(
        component.work_item_id,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return savedComponent;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: number, status: ComponentStatus): Promise<Component> {
    const component = await this.findOne(id);
    component.status = status;
    return await this.componentRepo.save(component);
  }
}
