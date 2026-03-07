import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Photo } from './entities/photo.entity';
import { PhotosService } from './photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  providers: [PhotosService, RolesGuard],
  exports: [PhotosService],
})
export class PhotosModule {}
