import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkItemEmployeeAssignment } from '../work-items/entities/work-item-employee-assignment.entity';
import { ContractorContract } from './entities/contractor-contract.entity';
import { EmployeeContract } from './entities/employee-contract.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { DistrictTpiAssignment } from './entities/district-tpi-assignment.entity';
import { TpiStaffRelationship } from './entities/tpi-staff-relationship.entity';
import { DoStaffRelationship } from './entities/do-staff-relationship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ContractorContract,
      EmployeeContract,
      WorkItemEmployeeAssignment,
      DistrictTpiAssignment,
      TpiStaffRelationship,
      DoStaffRelationship,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
