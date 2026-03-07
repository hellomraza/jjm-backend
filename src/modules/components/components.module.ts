import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { Component } from './entities/component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Component, WorkItem])],
  controllers: [ComponentsController],
  providers: [ComponentsService, RolesGuard],
  exports: [ComponentsService],
})
export class ComponentsModule {}
