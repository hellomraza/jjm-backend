import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { WorkItemStatus } from './entities/work-item.entity';
import { WorkItemsService } from './work-items.service';

@ApiTags('Work Items')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('work-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Create work item',
    description: 'Creates a new work item with location and assignment details',
  })
  @ApiCreatedResponse({ description: 'Work item created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() createWorkItemDto: CreateWorkItemDto) {
    return this.workItemsService.create(createWorkItemDto);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List work items',
    description: 'Returns paginated work items list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated work items list' })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.workItemsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get work item by ID',
    description: 'Returns work item details by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item found' })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  findOne(@Param('id') id: string) {
    return this.workItemsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Update work item',
    description: 'Updates editable fields of a work item',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  update(
    @Param('id') id: string,
    @Body() updateWorkItemDto: UpdateWorkItemDto,
  ) {
    return this.workItemsService.update(id, updateWorkItemDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Update work item status',
    description: 'Updates status of a work item',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: Object.values(WorkItemStatus),
          example: WorkItemStatus.IN_PROGRESS,
        },
      },
    },
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item status updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: WorkItemStatus,
  ) {
    return this.workItemsService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Delete work item',
    description: 'Deletes a work item by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item deleted successfully' })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  remove(@Param('id') id: string) {
    return this.workItemsService.remove(id);
  }
}
