import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadModule } from '../../common/upload/upload.module';
import { Photo } from './entities/photo.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Photo]), UploadModule],
  controllers: [PhotosController],
  providers: [PhotosService, RolesGuard],
  exports: [PhotosService],
})
export class PhotosModule {}
