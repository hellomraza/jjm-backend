import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ComponentTemplateService } from './component-template.service';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { ComponentTemplate } from './entities/component-template.entity';
import { Component } from './entities/component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Component, WorkItem, ComponentTemplate])],
  controllers: [ComponentsController],
  providers: [ComponentsService, ComponentTemplateService, RolesGuard],
  exports: [ComponentsService, ComponentTemplateService],
})
export class ComponentsModule {}
