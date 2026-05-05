import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { PhotoStatus } from './entities/photo-status.entity';
import { PhotoStatusService } from './photo-status.service';

@ApiTags('Photo Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('photo-status')
export class PhotoStatusController {
  constructor(private readonly photoStatusService: PhotoStatusService) {}

  /**
   * CO: Select a photo for a component (can select multiple)
   */
  @Post('select/:photoId')
  @Roles(UserRole.CO)
  @HttpCode(200)
  async selectPhoto(
    @Param('photoId') photoId: string,
    @Request() req: any,
  ): Promise<PhotoStatus> {
    const contractorId = req.user.userId;
    return this.photoStatusService.selectPhoto(photoId, contractorId);
  }

  /**
   * CO: Deselect a previously selected photo
   */
  @Post('deselect/:photoId')
  @Roles(UserRole.CO)
  @HttpCode(200)
  async deselectPhoto(
    @Param('photoId') photoId: string,
    @Request() req: any,
  ): Promise<PhotoStatus> {
    const contractorId = req.user.userId;
    return this.photoStatusService.deselectPhoto(photoId, contractorId);
  }

  /**
   * DO: Approve a photo (must be SELECTED first)
   */
  @Post('approve/:photoId')
  @Roles(UserRole.DO)
  @HttpCode(200)
  async approvePhoto(
    @Param('photoId') photoId: string,
    @Request() req: any,
  ): Promise<PhotoStatus> {
    const doUserId = req.user.userId;
    return this.photoStatusService.approvePhoto(photoId, doUserId);
  }

  /**
   * DO: Reject a previously approved photo (reverts to SELECTED)
   */
  @Post('reject/:photoId')
  @Roles(UserRole.DO)
  @HttpCode(200)
  async rejectPhoto(
    @Param('photoId') photoId: string,
    @Request() req: any,
  ): Promise<PhotoStatus> {
    const doUserId = req.user.userId;
    return this.photoStatusService.rejectPhoto(photoId, doUserId);
  }

  /**
   * CO/DO: Get all photos for a component with pagination
   */
  @Get('component/:componentId')
  @Roles(UserRole.CO, UserRole.DO, UserRole.HO)
  async getPhotosByComponent(
    @Param('componentId') componentId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    return this.photoStatusService.getPhotosByComponent(
      componentId,
      page,
      limit,
    );
  }

  /**
   * CO/DO: Get all selected photos for a work item
   */
  @Get('work-item/:workItemId/selected')
  @Roles(UserRole.CO, UserRole.DO)
  async getSelectedPhotosByWorkItem(
    @Param('workItemId') workItemId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    return this.photoStatusService.getSelectedPhotosByWorkItem(
      workItemId,
      page,
      limit,
    );
  }

  /**
   * DO/HO: Get all approved photos for a work item
   */
  @Get('work-item/:workItemId/approved')
  @Roles(UserRole.DO, UserRole.HO)
  async getApprovedPhotosByWorkItem(
    @Param('workItemId') workItemId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    return this.photoStatusService.getApprovedPhotosByWorkItem(
      workItemId,
      page,
      limit,
    );
  }

  /**
   * HO: Get all approved photos across all work items
   */
  @Get('approved/all')
  @Roles(UserRole.HO)
  async getAllApprovedPhotos(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    return this.photoStatusService.getAllApprovedPhotos(page, limit);
  }

  /**
   * CO: Get photos selected by the current contractor for a component
   */
  @Get('contractor-selected/:componentId')
  @Roles(UserRole.CO)
  async getSelectedPhotosByContractor(
    @Param('componentId') componentId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req: any,
  ): Promise<any> {
    const contractorId = req.user.id;
    return this.photoStatusService.getSelectedPhotosByContractor(
      componentId,
      contractorId,
      page,
      limit,
    );
  }

  /**
   * Get a single photo status record
   */
  @Get(':photoStatusId')
  @Roles(UserRole.CO, UserRole.DO, UserRole.HO)
  async findOne(
    @Param('photoStatusId') photoStatusId: string,
  ): Promise<PhotoStatus> {
    return this.photoStatusService.findOne(photoStatusId);
  }
}
