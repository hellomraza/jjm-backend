import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PaginatedResponse } from 'src/common/types/response.type';
import { ApiPaginatedResponse } from '../../common/decorators/paginated.responce.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  AssignMultipleEmployeesResponseDto,
  AssignWorkItemEmployeeDto,
} from './dto/assign-work-item-employee.dto';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import {
  EmployeeResponseDto,
  WorkItemResponseDto,
} from './dto/work-item-return-type.dto';
import { WorkItem, WorkItemStatus } from './entities/work-item.entity';
import { WorkItemsService } from './work-items.service';

@ApiTags('Work Items')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('work-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get('my-work-items')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List my work items',
    description:
      'Returns paginated work items filtered by logged-in user role and assignment scope',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(WorkItemResponseDto)
  async getMyWorkItems(
    @Request() req: { user: { userId: string; role: UserRole } },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<PaginatedResponse<WorkItem>> {
    return await this.workItemsService.getMyWorkItems(
      req.user.userId,
      req.user.role,
      page,
      limit,
    );
  }

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Create work item',
    description: 'Creates a new work item with location and assignment details',
  })
  @ApiCreatedResponse({
    description: 'Work item created successfully',
    type: WorkItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() createWorkItemDto: CreateWorkItemDto) {
    return this.workItemsService.create(createWorkItemDto);
  }

  @Get(':id/employees')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get employees assigned to work item',
    description: 'Returns list of employees assigned to a specific work item',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'Employees assigned to work item',
    type: [EmployeeResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  getAssignedEmployees(
    @Param('id') id: string,
  ): Promise<EmployeeResponseDto[]> {
    return this.workItemsService.getAssignedEmployees(id);
  }

  @Post(':id/assign-employee')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Assign employees to work item',
    description:
      'Assigns one or more employees to a contractor-owned work item',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiCreatedResponse({
    description: 'Employees assigned to work item',
    type: AssignMultipleEmployeesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  @ApiUnprocessableEntityResponse({
    description: 'One or more employee_ids are invalid or not employee users',
  })
  assignEmployee(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: AssignWorkItemEmployeeDto,
  ): Promise<AssignMultipleEmployeesResponseDto> {
    return this.workItemsService.assignMultipleEmployeesToWorkItem(
      req.user.userId,
      id,
      body.employee_ids,
    );
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List work items',
    description: 'Returns paginated work items list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(WorkItemResponseDto)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<PaginatedResponse<WorkItem>> {
    return await this.workItemsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get work item by ID',
    description: 'Returns work item details by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item found', type: WorkItemResponseDto })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  findOne(@Param('id') id: string) {
    return this.workItemsService.findOne(id);
  }

  @Get(':id/do-info')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get District Officer info by work item ID',
    description:
      'Returns the District Officer (DO) assigned to the district of the work item',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'District Officer found',
    type: 'object',
    schema: {
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        district_id: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Work item or District Officer not found',
  })
  getDistrictOfficerByWorkItem(@Param('id') id: string) {
    return this.workItemsService.getDistrictOfficerByWorkItem(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Update work item',
    description: 'Updates editable fields of a work item',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'Work item updated successfully',
    type: WorkItemResponseDto,
  })
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
  @ApiOkResponse({
    description: 'Work item status updated successfully',
    type: WorkItemResponseDto,
  })
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
