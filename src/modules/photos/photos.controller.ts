import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { PhotosService } from './photos.service';

@Controller('photos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload')
  @Roles(UserRole.EM)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png)$/i })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body() uploadPhotoDto: UploadPhotoDto,
    @Request() req,
  ) {
    return this.photosService.uploadPhoto(
      file,
      uploadPhotoDto,
      req.user.userId,
    );
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findAll() {
    return this.photosService.findAll();
  }

  @Get('component/:componentId/review')
  @Roles(UserRole.CO)
  reviewUploadedPhotos(
    @Param('componentId', ParseIntPipe) componentId: number,
  ) {
    return this.photosService.reviewByComponent(componentId);
  }

  @Patch(':id/select')
  @Roles(UserRole.CO)
  selectBestPhoto(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.photosService.selectBestPhoto(id, req.user.userId);
  }

  @Patch(':id/forward')
  @Roles(UserRole.CO)
  forwardSelectedPhoto(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.photosService.forwardSelectedPhoto(id, req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.photosService.findOne(id);
  }
}
