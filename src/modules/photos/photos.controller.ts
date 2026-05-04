import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/paginated.responce.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { UploadPhotoUrlDto } from './dto/upload-photo-url.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { PhotosService } from './photos.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@ApiTags('Photos')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('photos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload')
  @Roles(UserRole.EM)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload photo',
    description:
      'Uploads photo to S3 and stores metadata for employee work evidence',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'file',
        'latitude',
        'longitude',
        'component_id',
        'work_item_id',
        'timestamp',
      ],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg/jpeg/png, max 5MB)',
        },
        latitude: { type: 'number', example: 25.5941 },
        longitude: { type: 'number', example: 85.1376 },
        component_id: { type: 'number', example: 2001 },
        work_item_id: { type: 'number', example: 101 },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Photo uploaded and metadata stored',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid upload payload or file type/size',
  })
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png)$/i })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body() uploadPhotoDto: UploadPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.photosService.uploadPhoto(
      file,
      uploadPhotoDto,
      req.user.userId,
    );
  }

  @Post('upload-url')
  @Roles(UserRole.EM)
  @ApiOperation({
    summary: 'Upload photo metadata with Cloudinary URL',
    description:
      'Stores photo metadata using a client-uploaded Cloudinary URL and employee evidence fields',
  })
  @ApiBody({ type: UploadPhotoUrlDto })
  @ApiCreatedResponse({
    description: 'Photo metadata stored successfully using URL payload',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid upload-url payload' })
  uploadUrl(
    @Body() uploadPhotoUrlDto: UploadPhotoUrlDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.photosService.uploadPhotoUrl(
      uploadPhotoUrlDto,
      req.user.userId,
    );
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List photos',
    description: 'Returns paginated photo metadata list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(PhotoResponseDto)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.photosService.findAll(page, limit);
  }

  @Get('component/:componentId/review')
  @Roles(UserRole.CO, UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Review component photos',
    description: 'Contractor reviews paginated photos for a specific component',
  })
  @ApiParam({ name: 'componentId', type: String, description: 'Component ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(PhotoResponseDto)
  reviewUploadedPhotos(
    @Param('componentId') componentId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.photosService.reviewByComponent(componentId, page, limit);
  }

  @Patch(':id/select')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Select best photo',
    description: 'Marks one photo as selected for the component',
  })
  @ApiParam({ name: 'id', type: String, description: 'Photo ID' })
  @ApiOkResponse({
    description: 'Photo selected successfully',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid photo state for selection' })
  @ApiNotFoundResponse({ description: 'Photo not found' })
  selectBestPhoto(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.photosService.selectBestPhoto(id, req.user.userId);
  }

  @Patch(':id/forward')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Forward selected photo',
    description: 'Forwards selected photo to district office for approval flow',
  })
  @ApiParam({ name: 'id', type: String, description: 'Photo ID' })
  @ApiOkResponse({
    description: 'Photo forwarded successfully',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Photo not selected, already forwarded, or invalid contractor',
  })
  @ApiNotFoundResponse({ description: 'Photo not found' })
  forwardSelectedPhoto(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.photosService.forwardSelectedPhoto(id, req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get photo by ID',
    description: 'Returns single photo metadata and relations by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Photo ID' })
  @ApiOkResponse({ description: 'Photo found', type: PhotoResponseDto })
  @ApiNotFoundResponse({ description: 'Photo not found' })
  findOne(@Param('id') id: string) {
    return this.photosService.findOne(id);
  }
}
