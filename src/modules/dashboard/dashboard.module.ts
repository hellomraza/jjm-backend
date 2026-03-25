import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { District } from '../locations/entities/district.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { User } from '../users/entities/user.entity';
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
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
