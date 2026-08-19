import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { District } from '../locations/entities/district.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { User } from '../users/entities/user.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { TpiStaffRelationship } from '../users/entities/tpi-staff-relationship.entity';
import { WorkItemTpiStaffAssignment } from '../work-items/entities/work-item-tpi-staff-assignment.entity';
import { TpiReferencePhotoStatus } from '../photos/entities/tpi-reference-photo-status.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkItem,
      User,
      Agreement,
      District,
      WorkItemComponent,
      WorkItemEmployeeAssignment,
      TpiStaffRelationship,
      WorkItemTpiStaffAssignment,
      TpiReferencePhotoStatus,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
