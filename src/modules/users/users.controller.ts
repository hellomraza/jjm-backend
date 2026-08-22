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
import { CreateEEDto } from './dto/create-ee.dto';
import { UpdateEEDto } from './dto/update-ee.dto';
import { CreateDOStaffDto } from './dto/create-do-staff.dto';
import { UpdateDOStaffDto } from './dto/update-do-staff.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { UpdateContractorStatusDto } from './dto/update-contractor-status.dto';
import { UpdateDODto } from './dto/update-do.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateTpiDto } from './dto/create-tpi.dto';
import { UpdateTpiDto } from './dto/update-tpi.dto';
import { CreateTpiStaffDto } from './dto/create-tpi-staff.dto';
import { UpdateTpiStaffDto } from './dto/update-tpi-staff.dto';
import { UpdateTpiStatusDto } from './dto/update-tpi-status.dto';
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
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
    UserRole.EE,
    UserRole.DO_STAFF,
  )
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
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
    UserRole.TPI_STAFF,
    UserRole.EE,
    UserRole.DO_STAFF,
  )
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

  @Post('tpi')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Create TPI agency',
    description: 'Creates a new TPI agency user account (HO only)',
  })
  @ApiCreatedResponse({
    description: 'TPI agency created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User email or code already exists' })
  createTpi(@Body() createTpiDto: CreateTpiDto) {
    return this.usersService.createTpi(createTpiDto);
  }

  @Get('tpis')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Get all TPI agencies with search and filter',
    description: 'Returns a paginated list of TPI agencies (HO only)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'districtId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiPaginatedResponse(UserResponseDto)
  getAllTpis(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('districtId') districtId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const resolvedActive =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.usersService.findAllTpis(
      page,
      limit,
      search,
      districtId,
      resolvedActive,
    );
  }

  @Get('tpi/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Get TPI agency by ID',
    description: 'Returns a single TPI agency details (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'TPI ID' })
  @ApiOkResponse({ description: 'TPI agency found', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'TPI agency not found' })
  findOneTpi(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('tpi/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Update TPI agency details',
    description: 'Updates selected fields of an existing TPI agency (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'TPI ID' })
  @ApiOkResponse({
    description: 'TPI agency updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'TPI agency not found' })
  @ApiConflictResponse({ description: 'Email or code already in use' })
  updateTpi(@Param('id') id: string, @Body() updateTpiDto: UpdateTpiDto) {
    return this.usersService.updateTpi(id, updateTpiDto);
  }

  @Patch('tpi/:id/status')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Update TPI agency active status',
    description: 'Activates or deactivates a TPI agency account (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'TPI ID' })
  @ApiOkResponse({
    description: 'TPI status updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'TPI agency not found' })
  updateTpiStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTpiStatusDto,
  ) {
    return this.usersService.updateTpiStatus(id, updateStatusDto.is_active);
  }

  @Post('tpi-staff')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Create TPI staff member',
    description: 'Creates a new TPI staff member account (TPI only)',
  })
  @ApiCreatedResponse({
    description: 'TPI staff member created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User email already exists' })
  createTpiStaff(
    @Body() createTpiStaffDto: CreateTpiStaffDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.createTpiStaff(createTpiStaffDto, req.user.userId);
  }

  @Get('tpi-staff')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Get all TPI staff members',
    description:
      'Returns a paginated list of staff members belonging to the logged-in TPI',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiPaginatedResponse(UserResponseDto)
  getAllTpiStaff(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllTpiStaff(
      req.user.userId,
      page,
      limit,
      search,
    );
  }

  @Patch('tpi-staff/:id')
  @Roles(UserRole.TPI)
  @ApiOperation({
    summary: 'Update TPI staff member',
    description: 'Updates selected fields of a TPI staff member (TPI only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Staff member ID' })
  @ApiOkResponse({
    description: 'Staff member updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Staff member not found' })
  @ApiConflictResponse({ description: 'Email already in use' })
  updateTpiStaff(
    @Param('id') id: string,
    @Body() updateTpiStaffDto: UpdateTpiStaffDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateTpiStaff(
      id,
      req.user.userId,
      updateTpiStaffDto,
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
    UserRole.EE,
    UserRole.DO_STAFF,
  )
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

  // --- Executive Engineer (EE) Endpoints ---

  @Post('ee')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Create executive engineer',
    description:
      'Creates a new Executive Engineer account with name, email, password, and district (HO only)',
  })
  @ApiCreatedResponse({
    description: 'Executive Engineer created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'User with email already exists or EE already exists in district' })
  createEE(@Body() createEEDto: CreateEEDto) {
    return this.usersService.createEE(createEEDto);
  }

  @Patch('ee/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Edit executive engineer',
    description: 'Edits an existing Executive Engineer account (HO only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'EE ID' })
  @ApiOkResponse({
    description: 'Executive Engineer updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Executive Engineer not found' })
  @ApiConflictResponse({ description: 'Email or district conflict' })
  updateEE(@Param('id') id: string, @Body() updateEEDto: UpdateEEDto) {
    return this.usersService.updateEE(id, updateEEDto);
  }

  @Get('ees')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'List all executive engineers',
    description: 'Returns all Executive Engineers with district info (HO only)',
  })
  @ApiOkResponse({
    description: 'Executive Engineers retrieved successfully',
    type: [UserResponseDto],
  })
  findAllEEs() {
    return this.usersService.findAllEEs();
  }

  // --- DO Staff (DO_STAFF) Endpoints ---

  @Post('do-staff')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Create DO staff member',
    description:
      'Creates a DO Staff member belonging to the current District Officer (DO only, 1 per DO/district)',
  })
  @ApiCreatedResponse({
    description: 'DO staff member created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body or inactive DO' })
  @ApiConflictResponse({ description: 'Email already in use or staff member already exists for this DO/district' })
  createDOStaff(
    @Body() createDOStaffDto: CreateDOStaffDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.createDOStaff(createDOStaffDto, req.user.userId);
  }

  @Get('do-staff')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Get DO staff member',
    description: 'Returns the staff member belonging to the current District Officer',
  })
  @ApiOkResponse({
    description: 'DO staff retrieved successfully',
    type: UserResponseDto,
  })
  getDOStaff(@Request() req: AuthenticatedRequest) {
    return this.usersService.getDOStaff(req.user.userId);
  }

  @Patch('do-staff/:id')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Update DO staff member',
    description: 'Updates details of the DO staff member belonging to current DO',
  })
  @ApiParam({ name: 'id', type: String, description: 'Staff ID' })
  @ApiOkResponse({
    description: 'DO staff updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'DO staff not found' })
  @ApiForbiddenResponse({ description: 'You do not own this DO staff member' })
  @ApiConflictResponse({ description: 'Email already in use' })
  updateDOStaff(
    @Param('id') id: string,
    @Body() updateDOStaffDto: UpdateDOStaffDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateDOStaff(
      id,
      req.user.userId,
      updateDOStaffDto,
    );
  }
}
