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
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmitBankDetailsDto } from './dto/submit-bank-details.dto';
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
  ApiConsumes,
} from '@nestjs/swagger';
import { PaginatedResponse } from '../../common/types/response.type';
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
import { WorkItem, WorkItemStatus, WorkOrderType } from './entities/work-item.entity';
import { AssignTpiStaffDto } from './dto/assign-tpi-staff.dto';
import { ExecutiveEngineerGuard } from '../../common/guards/executive-engineer.guard';
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
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM, UserRole.TPI, UserRole.TPI_STAFF)
  @ApiOperation({
    summary: 'List my work items',
    description:
      'Returns paginated work items filtered by logged-in user role and assignment scope',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by work code (partial match)',
  })
  @ApiQuery({
    name: 'workOrderType',
    required: false,
    enum: WorkOrderType,
    description: 'Filter by work order type',
  })
  @ApiPaginatedResponse(WorkItemResponseDto)
  async getMyWorkItems(
    @Request() req: { user: { userId: string; role: UserRole } },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('workOrderType') workOrderType?: WorkOrderType,
  ): Promise<PaginatedResponse<WorkItem>> {
    return await this.workItemsService.getMyWorkItems(
      req.user.userId,
      req.user.role,
      page,
      limit,
      search,
      workOrderType,
    );
  }

  @Get('without-agreement')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List work items without agreement',
    description: 'Returns paginated work items that are not associated with any agreement',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(WorkItemResponseDto)
  async findWithoutAgreement(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<PaginatedResponse<WorkItem>> {
    return await this.workItemsService.findWithoutAgreement(page, limit);
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
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
  )
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
  async getAssignedEmployees(
    @Param('id') id: string,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.workItemsService.getAssignedEmployees(id);
    return employees.map((emp) => ({
      id: emp.id,
      code: emp.code ?? '',
      email: emp.email,
    }));
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
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
  )
  @ApiOperation({
    summary: 'List work items',
    description: 'Returns paginated work items list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by work code (partial match)',
  })
  @ApiPaginatedResponse(WorkItemResponseDto)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<WorkItem>> {
    return await this.workItemsService.findAll(page, limit, search);
  }

  @Get('completed')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'List completed work items for DO',
    description: 'Returns completed work items for the logged-in DO with bank details left joined.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getCompletedWorkItems(
    @Request() req: { user: { userId: string } },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return await this.workItemsService.findCompletedWorkItemsForDO(
      req.user.userId,
      page,
      limit,
      search,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
  )
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
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
  )
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
    description: 'Deletes an existing work item by ID (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({ description: 'Work item deleted successfully' })
  @ApiNotFoundResponse({ description: 'Work item not found' })
  remove(@Param('id') id: string) {
    return this.workItemsService.remove(id);
  }

  @Post(':id/assign-tpi')
  @UseGuards(ExecutiveEngineerGuard)
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Assign TPI agency to work item',
    description: 'Automatically resolves and assigns the active TPI of the district to the work item (Executive Engineer DO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'TPI agency assigned successfully',
    type: WorkItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid assignment payload or state' })
  @ApiForbiddenResponse({ description: 'DO is not an Executive Engineer or district mismatch' })
  assignTpi(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.workItemsService.assignTpi(id, req.user.userId);
  }

  @Delete(':id/tpi')
  @UseGuards(ExecutiveEngineerGuard)
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Unassign TPI agency from work item',
    description: 'Removes TPI agency and staff assignments from the work item (Executive Engineer DO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiOkResponse({
    description: 'TPI agency unassigned successfully',
    type: WorkItemResponseDto,
  })
  @ApiForbiddenResponse({ description: 'DO is not an Executive Engineer or district mismatch' })
  unassignTpi(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.workItemsService.unassignTpi(id, req.user.userId);
  }

  @Post(':id/assign-tpi-staff')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Assign TPI staff to Bulk Village work item',
    description: 'Assigns TPI staff member to work item (TPI agency only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiBody({ type: AssignTpiStaffDto })
  @ApiCreatedResponse({ description: 'Staff member assigned successfully' })
  @ApiForbiddenResponse({ description: 'Work item not owned by caller TPI or staff does not belong to TPI' })
  assignTpiStaff(
    @Param('id') id: string,
    @Body() dto: AssignTpiStaffDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.workItemsService.assignTpiStaff(id, req.user.userId, dto.staffId);
  }

  @Delete(':id/tpi-staff/:staffId')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Unassign TPI staff from Bulk Village work item',
    description: 'Removes TPI staff member assignment from work item (TPI agency only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  @ApiParam({ name: 'staffId', type: String, description: 'TPI Staff user ID' })
  @ApiOkResponse({ description: 'Staff member unassigned successfully' })
  @ApiForbiddenResponse({ description: 'Work item not owned by caller TPI' })
  unassignTpiStaff(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.workItemsService.unassignTpiStaff(id, req.user.userId, staffId);
  }

  @Post(':id/bank-details')
  @Roles(UserRole.DO)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Submit bank details for a completed work item',
    description: 'Uploads voucher file and saves/submits bank details for a completed work item.',
  })
  @ApiConsumes('multipart/form-data')
  async submitBankDetails(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: any,
    @Body() dto: SubmitBankDetailsDto,
    @Request() req: { user: { userId: string } },
  ) {
    return await this.workItemsService.submitBankDetails(
      id,
      file,
      dto,
      req.user.userId,
    );
  }

  @Patch(':id/bank-details/approve')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Approve bank details for a completed work item',
    description: 'Approve submitted bank details for a completed work item.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Work item ID' })
  async approveBankDetails(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return await this.workItemsService.approveBankDetails(id, req.user.userId);
  }
}
