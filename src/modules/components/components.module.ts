import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Photo } from '../photos/entities/photo.entity';
import { PhotosModule } from '../photos/photos.module';
import { User } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { Component } from './entities/component.entity';
import { WorkItemComponent } from './entities/work-item-component.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Component,
      WorkItemComponent,
      WorkItem,
      Photo,
      User,
    ]),
    PhotosModule,
  ],
  controllers: [ComponentsController],
  providers: [ComponentsService, RolesGuard],
  exports: [ComponentsService],
})
export class ComponentsModule {}
