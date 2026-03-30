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
import { PhotoResponseDto } from '../photos/dto/photo-response.dto';
import { UserRole } from '../users/entities/user.entity';
import { ComponentsService } from './components.service';
import {
  ActionResponseDto,
  ComponentResponseDto,
  WorkItemComponentResponseDto,
} from './dto/component-response.dto';
import { SelectPhotoDto } from './dto/select-photo.dto';
import { SubmitPhotoDto } from './dto/submit-photo.dto';
import { UpdateWorkItemComponentDto } from './dto/update-work-item-component.dto';
import { UploadComponentPhotoUrlDto } from './dto/upload-component-photo-url.dto';
import { UploadComponentPhotoDto } from './dto/upload-component-photo.dto';

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@ApiTags('Components')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('components')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Get('master')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List master components',
    description: 'Returns predefined static master components in display order',
  })
  @ApiOkResponse({
    description: 'Master components list',
    type: ComponentResponseDto,
    isArray: true,
  })
  findMasterComponents() {
    return this.componentsService.findMasterComponents();
  }

  @Post(':componentId/photos')
  @Roles(UserRole.EM)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload photo for a component',
    description: 'Employee uploads photo for a work item component mapping',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'progress', 'latitude', 'longitude', 'timestamp'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg/jpeg/png, max 5MB)',
        },
        progress: {
          type: 'number',
          example: 25,
          description: 'Completed work progress for the component',
        },
        latitude: { type: 'number', example: 25.5941 },
        longitude: { type: 'number', example: 85.1376 },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-07T10:30:00.000Z',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Photo uploaded successfully',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid upload payload' })
  uploadComponentPhoto(
    @Param('componentId') componentId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png)$/i })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body() uploadComponentPhotoDto: UploadComponentPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.uploadPhoto(
      componentId,
      file,
      uploadComponentPhotoDto,
      req.user.userId,
    );
  }

  @Post(':componentId/photos-url')
  @Roles(UserRole.EM)
  @ApiOperation({
    summary: 'Upload photo URL for a component',
    description:
      'Employee submits a Cloudinary URL for a work item component mapping and updates component progress',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiBody({ type: UploadComponentPhotoUrlDto })
  @ApiCreatedResponse({
    description: 'Photo URL stored successfully',
    type: PhotoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid upload payload' })
  uploadComponentPhotoUrl(
    @Param('componentId') componentId: string,
    @Body() uploadComponentPhotoUrlDto: UploadComponentPhotoUrlDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.uploadPhotoUrl(
      componentId,
      uploadComponentPhotoUrlDto,
      req.user.userId,
    );
  }

  @Get(':componentId/photos')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Get photos uploaded for a component',
    description: 'Contractor views all photos uploaded for a component',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(PhotoResponseDto)
  getComponentPhotos(
    @Param('componentId') componentId: string,
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.componentsService.getComponentPhotos(
      componentId,
      req.user.userId,
      page,
      limit,
    );
  }

  @Post(':componentId/select-photo')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Contractor selects one photo and submits component',
    description:
      'Ensures only one selected photo per component and moves component to submitted state',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Photo selected and component submitted',
    type: ActionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid selection or component state',
  })
  @ApiNotFoundResponse({ description: 'Component or photo not found' })
  selectPhoto(
    @Param('componentId') componentId: string,
    @Body() selectPhotoDto: SelectPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.selectPhoto(
      componentId,
      selectPhotoDto.photoId,
      req.user.userId,
    );
  }

  @Post(':componentId/approve')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'District officer approves selected photo',
    description: 'Moves submitted component to approved status',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Component approved successfully',
    type: ActionResponseDto,
  })
  approveComponent(
    @Param('componentId') componentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.approveComponent(
      componentId,
      req.user.userId,
    );
  }

  @Post(':componentId/reject')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'District officer rejects selected photo',
    description:
      'Moves submitted component to rejected status so contractor can select another photo',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Component rejected successfully',
    type: ActionResponseDto,
  })
  rejectComponent(
    @Param('componentId') componentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.rejectComponent(componentId, req.user.userId);
  }

  @Get('pending-approval')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'District officer pending approval dashboard',
    description:
      'Returns submitted components pending approval for district officer district',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(WorkItemComponentResponseDto)
  getPendingApproval(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.componentsService.getPendingApproval(
      req.user.userId,
      page,
      limit,
    );
  }

  @Get('approved')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Head office approved components view',
    description: 'Returns components with approved status for head office',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(WorkItemComponentResponseDto)
  getApprovedComponents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.componentsService.getApprovedComponents(page, limit);
  }

  @Get('work-item/:workItemId')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List work item component mappings',
    description:
      'Returns component mappings for a work item sorted by master order',
  })
  @ApiParam({ name: 'workItemId', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'Work item component mappings',
    type: WorkItemComponentResponseDto,
    isArray: true,
  })
  findByWorkItem(@Param('workItemId') workItemId: string) {
    return this.componentsService.findByWorkItem(workItemId);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get work item component mapping by ID',
    description: 'Returns mapping details by work item component mapping ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Mapping found',
    type: WorkItemComponentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Mapping not found' })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOneMapping(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Update work item component mapping',
    description: 'Updates only quantity, remarks, and status on mapping row',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Mapping updated successfully',
    type: WorkItemComponentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Mapping not found' })
  update(
    @Param('id') id: string,
    @Body() updateWorkItemComponentDto: UpdateWorkItemComponentDto,
  ) {
    return this.componentsService.updateMapping(id, updateWorkItemComponentDto);
  }

  @Post(':componentId/submit-photo')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Submit selected photo for component approval',
    description:
      'Contractor selects a single uploaded photo for a component and submits it for district approval',
  })
  @ApiParam({
    name: 'componentId',
    type: String,
    description: 'Work item component mapping ID',
  })
  @ApiOkResponse({
    description: 'Photo submitted for approval',
    type: ActionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid submission state or payload' })
  @ApiNotFoundResponse({ description: 'Component mapping or photo not found' })
  submitPhoto(
    @Param('componentId') componentId: string,
    @Body() submitPhotoDto: SubmitPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.componentsService.submitPhoto(
      componentId,
      submitPhotoDto.photoId,
      req.user.userId,
    );
  }
}
