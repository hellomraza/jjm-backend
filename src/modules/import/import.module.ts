import { Module } from '@nestjs/common';
import { AgreementsModule } from '../agreements/agreements.module';
import { UsersModule } from '../users/users.module';
import { WorkItemsModule } from '../work-items/work-items.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [AgreementsModule, UsersModule, WorkItemsModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
