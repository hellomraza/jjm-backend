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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

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
  createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.usersService.createEmployee(createEmployeeDto);
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
  createContractor(@Body() createContractorDto: CreateContractorDto) {
    return this.usersService.createContractor(createContractorDto);
  }

  @Get('my-profile')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
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
    summary: 'Get all contractors',
    description:
      'Returns a list of all contractors (users with CO role) without password field',
  })
  @ApiOkResponse({
    description: 'Contractors retrieved successfully',
    type: [UserResponseDto],
  })
  getAllContractors() {
    return this.usersService.getAllContractors();
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
