import {
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PhotosService } from './photos.service';
import { TpiReferencePhotoStatusResponseDto } from './dto/tpi-reference-photo-status-response.dto';

@ApiTags('TPI Photo Status')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('tpi-photo-status')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TpiPhotoStatusController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('select/:photoId')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Select TPI reference photo',
    description: 'Marks one TPI reference photo as selected for the component',
  })
  @ApiParam({ name: 'photoId', type: String, description: 'TPI reference photo ID' })
  @ApiOkResponse({ description: 'Photo selected successfully', type: TpiReferencePhotoStatusResponseDto })
  select(@Param('photoId') photoId: string, @Request() req: { user: { userId: string } }) {
    return this.photosService.selectTpiReferencePhoto(photoId, req.user.userId);
  }

  @Post('deselect/:photoId')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Deselect TPI reference photo',
    description: 'Deselects the currently selected TPI reference photo',
  })
  @ApiParam({ name: 'photoId', type: String, description: 'TPI reference photo ID' })
  @ApiOkResponse({ description: 'Photo deselected successfully', type: TpiReferencePhotoStatusResponseDto })
  deselect(@Param('photoId') photoId: string, @Request() req: { user: { userId: string } }) {
    return this.photosService.deselectTpiReferencePhoto(photoId, req.user.userId);
  }

  @Get('component/:componentId')
  @Roles(UserRole.TPI, UserRole.TPI_STAFF, UserRole.DO)
  @ApiOperation({
    summary: 'Get TPI reference photo selection status for component',
    description: 'Returns the selected TPI reference photo details for a component',
  })
  @ApiParam({ name: 'componentId', type: String, description: 'Component mapping ID' })
  @ApiOkResponse({ description: 'Status retrieved successfully', type: TpiReferencePhotoStatusResponseDto })
  getStatus(
    @Param('componentId') componentId: string,
    @Request() req: { user: { userId: string; role: UserRole } },
  ) {
    return this.photosService.getTpiReferencePhotoStatus(componentId, req.user.userId, req.user.role);
  }
}
