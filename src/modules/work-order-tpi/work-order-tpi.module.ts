import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Component } from '../components/entities/component.entity';
import { User } from '../users/entities/user.entity';
import { WorkOrderTpiAssignment } from './entities/work-order-tpi-assignment.entity';
import { WorkOrderTpiComponent } from './entities/work-order-tpi-component.entity';
import { WorkOrderTpiEmployeeAssignment } from './entities/work-order-tpi-employee-assignment.entity';
import { WorkOrderTpiPhotoStatus } from './entities/work-order-tpi-photo-status.entity';
import { WorkOrderTpiPhoto } from './entities/work-order-tpi-photo.entity';
import { WorkOrderTpi } from './entities/work-order-tpi.entity';
import { WorkOrderTpiController } from './work-order-tpi.controller';
import { WorkOrderTpiService } from './work-order-tpi.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrderTpi,
      WorkOrderTpiComponent,
      WorkOrderTpiAssignment,
      WorkOrderTpiEmployeeAssignment,
      WorkOrderTpiPhoto,
      WorkOrderTpiPhotoStatus,
      User,
      Agreement,
      Component,
    ]),
  ],
  controllers: [WorkOrderTpiController],
  providers: [WorkOrderTpiService],
  exports: [WorkOrderTpiService],
})
export class WorkOrderTpiModule {}
