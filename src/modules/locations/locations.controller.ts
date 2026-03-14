import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';
import { LocationMasterType } from './locations.types';

@ApiTags('Locations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post(':type')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Create location master record',
    description:
      'Creates record in districts/blocks/panchayats/villages/subdivisions/circles/zones',
  })
  @ApiParam({
    name: 'type',
    enum: LocationMasterType,
    description: 'Location master type',
  })
  @ApiCreatedResponse({ description: 'Location record created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid type or request body' })
  create(
    @Param('type') type: LocationMasterType,
    @Body() createLocationDto: CreateLocationDto,
  ) {
    return this.locationsService.create(type, createLocationDto);
  }

  @Get(':type')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'List location master records',
    description: 'Returns paginated location records by type',
  })
  @ApiParam({
    name: 'type',
    enum: LocationMasterType,
    description: 'Location master type',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated location master list' })
  findAll(
    @Param('type') type: LocationMasterType,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.locationsService.findAll(type, page, limit);
  }

  @Get(':type/:id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  @ApiOperation({
    summary: 'Get location master record by ID',
    description: 'Returns one location record by type and numeric ID',
  })
  @ApiParam({
    name: 'type',
    enum: LocationMasterType,
    description: 'Location master type',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Record ID' })
  @ApiOkResponse({ description: 'Location record found' })
  @ApiNotFoundResponse({ description: 'Location record not found' })
  findOne(
    @Param('type') type: LocationMasterType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.locationsService.findOne(type, id);
  }

  @Patch(':type/:id')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Update location master record',
    description: 'Updates location record fields by type and numeric ID',
  })
  @ApiParam({
    name: 'type',
    enum: LocationMasterType,
    description: 'Location master type',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Record ID' })
  @ApiOkResponse({ description: 'Location record updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid type or request body' })
  @ApiNotFoundResponse({ description: 'Location record not found' })
  update(
    @Param('type') type: LocationMasterType,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(type, id, updateLocationDto);
  }

  @Delete(':type/:id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Delete location master record',
    description: 'Deletes location record by type and numeric ID',
  })
  @ApiParam({
    name: 'type',
    enum: LocationMasterType,
    description: 'Location master type',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Record ID' })
  @ApiOkResponse({ description: 'Location record deleted successfully' })
  @ApiNotFoundResponse({ description: 'Location record not found' })
  remove(
    @Param('type') type: LocationMasterType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.locationsService.remove(type, id);
  }
}
