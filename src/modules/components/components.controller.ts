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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Components')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('components')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Create component',
    description: 'Creates a new component for a work item',
  })
  @ApiCreatedResponse({ description: 'Component created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@Body() createComponentDto: CreateComponentDto) {
    return this.componentsService.create(createComponentDto);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'List components',
    description: 'Returns paginated components list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated components list' })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.componentsService.findAll(page, limit);
  }

  @Get('work-item/:workItemId')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List components by work item',
    description: 'Returns paginated components for a specific work item',
  })
  @ApiParam({ name: 'workItemId', type: Number, description: 'Work item ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated components for work item' })
  findByWorkItem(
    @Param('workItemId') workItemId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.componentsService.findByWorkItem(+workItemId, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get component by ID',
    description: 'Returns component details by component ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component found' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Update component',
    description: 'Updates editable fields of a component',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  update(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ) {
    return this.componentsService.update(+id, updateComponentDto);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Delete component',
    description: 'Deletes component by ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component deleted successfully' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  remove(@Param('id') id: string) {
    return this.componentsService.remove(+id);
  }

  @Post(':id/start')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Start component',
    description:
      'Starts component execution, validating sequential approval rule',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component started successfully' })
  @ApiBadRequestResponse({
    description:
      'Previous component not approved or component cannot be started',
  })
  @ApiNotFoundResponse({ description: 'Component not found' })
  startComponent(@Param('id') id: string) {
    return this.componentsService.startComponent(+id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.DO, UserRole.HO)
  @ApiOperation({
    summary: 'Approve component',
    description: 'Approves an in-progress component and updates work progress',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component approved successfully' })
  @ApiBadRequestResponse({ description: 'Component is not in progress' })
  @ApiConflictResponse({ description: 'Component already approved' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  approveComponent(@Param('id') id: string, @Request() req) {
    return this.componentsService.approveComponent(+id, req.user.userId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.DO, UserRole.HO)
  @ApiOperation({
    summary: 'Reject component',
    description: 'Rejects an in-progress component and updates work progress',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component rejected successfully' })
  @ApiBadRequestResponse({ description: 'Component is not in progress' })
  @ApiConflictResponse({ description: 'Component already rejected' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  rejectComponent(@Param('id') id: string, @Request() req) {
    return this.componentsService.rejectComponent(+id, req.user.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Update component status',
    description: 'Updates component status directly',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Component ID' })
  @ApiOkResponse({ description: 'Component status updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid status value' })
  @ApiNotFoundResponse({ description: 'Component not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.componentsService.updateStatus(+id, updateStatusDto.status);
  }
}
