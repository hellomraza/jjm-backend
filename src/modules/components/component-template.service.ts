import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComponentTemplate } from './entities/component-template.entity';

@Injectable()
export class ComponentTemplateService {
  private readonly logger = new Logger(ComponentTemplateService.name);

  constructor(
    @InjectRepository(ComponentTemplate)
    private readonly templateRepo: Repository<ComponentTemplate>,
  ) {}

  /**
   * Fetch all component templates ordered by order_number
   * Used for creating work item components
   */
  async findAll(): Promise<ComponentTemplate[]> {
    this.logger.log('Fetching all component templates');
    return this.templateRepo.find({
      order: { order_number: 'ASC' },
    });
  }

  /**
   * Get a specific template by order number
   */
  async findByOrderNumber(
    orderNumber: number,
  ): Promise<ComponentTemplate | null> {
    return this.templateRepo.findOne({
      where: { order_number: orderNumber },
    });
  }

  /**
   * Get the total count of templates (should always be 12)
   */
  async count(): Promise<number> {
    return this.templateRepo.count();
  }
}
