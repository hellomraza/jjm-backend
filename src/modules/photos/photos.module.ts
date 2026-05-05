import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadModule } from '../../common/upload/upload.module';
import { Component } from '../components/entities/component.entity';
import { WorkItemComponent } from '../components/entities/work-item-component.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { PhotoStatus } from './entities/photo-status.entity';
import { Photo } from './entities/photo.entity';
import { PhotoStatusController } from './photo-status.controller';
import { PhotoStatusService } from './photo-status.service';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Photo,
      PhotoStatus,
      WorkItem,
      Component,
      WorkItemComponent,
    ]),
    UploadModule,
  ],
  controllers: [PhotosController, PhotoStatusController],
  providers: [PhotosService, PhotoStatusService, RolesGuard],
  exports: [PhotosService, PhotoStatusService],
})
export class PhotosModule {}
