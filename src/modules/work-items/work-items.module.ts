import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Component } from '../components/entities/component.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { User } from '../users/entities/user.entity';
import { WorkItemEmployeeAssignment } from './entities/work-item-employee-assignment.entity';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkItem,
      Component,
      WorkItemComponent,
      WorkItemEmployeeAssignment,
      User,
    ]),
  ],
  controllers: [WorkItemsController],
  providers: [WorkItemsService, RolesGuard],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
