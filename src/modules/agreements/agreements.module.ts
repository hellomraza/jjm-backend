import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { Agreement } from './entities/agreement.entity';
import { AgreementFile } from './entities/agreement-file.entity';
import { AgreementFileMap } from './entities/agreement-file-map.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agreement,
      AgreementFile,
      AgreementFileMap,
      User,
      WorkItem,
      WorkItemEmployeeAssignment,
    ]),
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService, RolesGuard],
  exports: [AgreementsService],
})
export class AgreementsModule {}
