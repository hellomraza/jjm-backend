import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkItem])],
  controllers: [WorkItemsController],
  providers: [WorkItemsService, RolesGuard],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
