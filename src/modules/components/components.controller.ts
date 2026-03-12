import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ComponentsService } from './components.service';
import { SubmitPhotoDto } from './dto/submit-photo.dto';
import { UpdateWorkItemComponentDto } from './dto/update-work-item-component.dto';

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
  @ApiOkResponse({ description: 'Master components list' })
  findMasterComponents() {
    return this.componentsService.findMasterComponents();
  }

  @Get('work-item/:workItemId')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List work item component mappings',
    description:
      'Returns component mappings for a work item sorted by master order',
  })
  @ApiParam({ name: 'workItemId', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item component mappings' })
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
  @ApiOkResponse({ description: 'Mapping found' })
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
  @ApiOkResponse({ description: 'Mapping updated successfully' })
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
  @ApiOkResponse({ description: 'Photo submitted for approval' })
  @ApiBadRequestResponse({ description: 'Invalid submission state or payload' })
  @ApiNotFoundResponse({ description: 'Component mapping or photo not found' })
  submitPhoto(
    @Param('componentId') componentId: string,
    @Body() submitPhotoDto: SubmitPhotoDto,
    @Request() req,
  ) {
    return this.componentsService.submitPhoto(
      componentId,
      submitPhotoDto.photoId,
      req.user.userId,
    );
  }
}
