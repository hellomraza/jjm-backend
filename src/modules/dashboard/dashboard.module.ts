import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from '../agreements/entities/agreement.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { User } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkItem, User, Agreement])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
