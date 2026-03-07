import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { Component } from './entities/component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Component])],
  controllers: [ComponentsController],
  providers: [ComponentsService, RolesGuard],
  exports: [ComponentsService],
})
export class ComponentsModule {}
