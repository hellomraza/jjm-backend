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
  ApiConflictResponse,
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
import { CreateContractorDto } from './dto/create-contractor.dto';
import { CreateDODto } from './dto/create-do.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateTpiDto } from './dto/create-tpi.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { UpdateContractorStatusDto } from './dto/update-contractor-status.dto';
import { UpdateDODto } from './dto/update-do.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateTpiDto } from './dto/update-tpi.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: UserRole;
  };
};

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Create user',
    description: 'Creates a new user account with role and optional district',
  })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('employee')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Create employee',
    description:
      'Creates a new employee account with name, email, and password',
  })
  @ApiCreatedResponse({
    description: 'Employee created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists' })
  createEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.createEmployee(
      createEmployeeDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch('employee/:id')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Edit employee',
    description: 'Edits an existing employee account (CO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Employee ID' })
  @ApiOkResponse({
    description: 'Employee updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.usersService.update(id, updateEmployeeDto);
  }

  @Post('contractor')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Create contractor',
    description:
      'Creates a new contractor account with name, email, and password',
  })
  @ApiCreatedResponse({
    description: 'Contractor created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists' })
  createContractor(
    @Body() createContractorDto: CreateContractorDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.createContractor(
      createContractorDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch('contractor/:id')
  @Roles(UserRole.DO, UserRole.HO)
  @ApiOperation({
    summary: 'Edit contractor',
    description: 'Edits an existing contractor account (DO and HO)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Contractor ID' })
  @ApiOkResponse({
    description: 'Contractor updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Contractor not found' })
  updateContractor(
    @Param('id') id: string,
    @Body() updateContractorDto: UpdateContractorDto,
  ) {
    return this.usersService.update(id, updateContractorDto);
  }

  @Patch('contractor/:id/status')
  @Roles(UserRole.DO, UserRole.HO)
  @ApiOperation({
    summary: 'Update contractor active status',
    description: 'Activates or deactivates a contractor account (DO and HO)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Contractor ID' })
  @ApiOkResponse({
    description: 'Contractor status updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Contractor not found' })
  updateContractorStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateContractorStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateContractorStatus(
      id,
      updateStatusDto.is_active,
      req.user.userId,
      req.user.role,
    );
  }

  @Post('do')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Create district office manager',
    description:
      'Creates a new district office account with name, email, password, and optional district',
  })
  @ApiCreatedResponse({
    description: 'District office created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists' })
  createDO(@Body() createDODto: CreateDODto) {
    return this.usersService.createDO(createDODto);
  }

  @Patch('do/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Edit district office manager',
    description: 'Edits an existing district office account (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'DO ID' })
  @ApiOkResponse({
    description: 'District office updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'District office not found' })
  updateDO(@Param('id') id: string, @Body() updateDODto: UpdateDODto) {
    return this.usersService.updateDO(id, updateDODto);
  }

  @Get('my-created-users')
  @Roles(UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Get users created by me',
    description:
      'Returns paginated users created by the current contractor or district office user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(UserResponseDto)
  getMyCreatedUsers(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.usersService.getMyCreatedUsers(
      req.user.userId,
      req.user.role,
      page,
      limit,
    );
  }

  @Get('my-profile')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM, UserRole.TPI)
  @ApiOperation({
    summary: 'Get my profile',
    description:
      'Returns the profile details of the currently authenticated user',
  })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    type: UserResponseDto,
  })
  getMyProfile(@Request() req: { user: { userId: string } }) {
    return this.usersService.getMyProfile(req.user.userId);
  }

  @Patch(':id/toggle-executive-engineer')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Toggle executive engineer permission for DO',
    description: 'Enables or disables executive engineer permissions on a DO account (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'District Officer user ID' })
  @ApiOkResponse({
    description: 'Executive engineer status toggled successfully',
    type: UserResponseDto,
  })
  toggleExecutiveEngineer(
    @Param('id') id: string,
    @Body('is_executive_engineer') isExecutiveEngineer?: boolean,
  ) {
    return this.usersService.toggleExecutiveEngineer(id, isExecutiveEngineer);
  }

  @Post('tpi')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Create TPI officer',
    description: 'Creates a new TPI officer account assigned to a district (HO only, strictly 1 per district)',
  })
  @ApiCreatedResponse({
    description: 'TPI officer created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists or district already has a TPI' })
  createTpi(@Body() createTpiDto: CreateTpiDto) {
    return this.usersService.createTPI(createTpiDto);
  }

  @Patch('tpi/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Update TPI officer',
    description: 'Updates an existing TPI officer account (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'TPI Officer user ID' })
  @ApiOkResponse({
    description: 'TPI officer updated successfully',
    type: UserResponseDto,
  })
  updateTpi(@Param('id') id: string, @Body() updateTpiDto: UpdateTpiDto) {
    return this.usersService.updateTPI(id, updateTpiDto);
  }

  @Get('tpi')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Get all TPI officers',
    description: 'Returns all TPI officers, optionally filtered by district_id',
  })
  @ApiQuery({ name: 'district_id', required: false, type: String })
  @ApiOkResponse({
    description: 'List of TPI officers',
    type: [UserResponseDto],
  })
  getAllTpis(@Query('district_id') districtId?: string) {
    return this.usersService.getAllTPIs(districtId);
  }

  @Get('employees')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Get all employees',
    description:
      'Returns a list of all employees (users with EM role) without password field',
  })
  @ApiOkResponse({
    description: 'Employees retrieved successfully',
    type: [UserResponseDto],
  })
  getAllEmployees() {
    return this.usersService.getAllEmployees();
  }

  @Get('contractors')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Get contractors with pagination and search',
    description:
      'Returns a paginated list of contractors (users with CO role) without password field',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by contractor name, email, code, mobile, or PAN',
  })
  @ApiPaginatedResponse(UserResponseDto)
  getAllContractors(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.getAllContractors(
      req.user.userId,
      req.user.role,
      page,
      limit,
      search,
    );
  }

  @Get('dos')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Get all district offices',
    description:
      'Returns a list of all district office managers (users with DO role) without password field',
  })
  @ApiOkResponse({
    description: 'District offices retrieved successfully',
    type: [UserResponseDto],
  })
  getAllDOs() {
    return this.usersService.getAllDOs();
  }

  @Get('work-item/:workItemId/employees')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Get employees by work item',
    description:
      'Returns a list of all employees assigned to a specific work item',
  })
  @ApiParam({
    name: 'workItemId',
    type: String,
    description: 'Work item ID',
  })
  @ApiOkResponse({
    description: 'Employees retrieved successfully',
    type: [UserResponseDto],
  })
  getEmployeesByWorkItemId(@Param('workItemId') workItemId: string) {
    return this.usersService.getEmployeesByWorkItemId(workItemId);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List users',
    description: 'Returns paginated user list without password field',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(UserResponseDto)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Returns a single user details by user ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiOkResponse({ description: 'User found', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates selected fields of an existing user',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiOkResponse({
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email already in use' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes an existing user by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
