import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComponentsService } from './components.service';
import { ComponentsController } from './components.controller';
import { Component } from './entities/component.entity';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Component])],
  controllers: [ComponentsController],
  providers: [ComponentsService, RolesGuard],
  exports: [ComponentsService],
})
export class ComponentsModule {}
