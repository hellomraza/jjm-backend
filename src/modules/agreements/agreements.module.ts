import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { Agreement } from './entities/agreement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agreement, User, WorkItem])],
  controllers: [AgreementsController],
  providers: [AgreementsService, RolesGuard],
  exports: [AgreementsService],
})
export class AgreementsModule {}
