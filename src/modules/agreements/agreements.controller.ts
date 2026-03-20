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
import { ApiPaginatedResponse } from '../../common/decorators/paginated.responce.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AgreementsService } from './agreements.service';
import { AgreementResponseDto } from './dto/agreement-response.dto';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';

@ApiTags('Agreements')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permission' })
@Controller('agreements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Create agreement',
    description:
      'Creates a new agreement/work order linked to contractor and work item',
  })
  @ApiCreatedResponse({
    description: 'Agreement created successfully',
    type: AgreementResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnprocessableEntityResponse({
    description: 'contractor_id or work_id does not exist',
  })
  create(@Body() createAgreementDto: CreateAgreementDto) {
    return this.agreementsService.create(createAgreementDto);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'List agreements',
    description: 'Returns paginated agreements list',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiPaginatedResponse(AgreementResponseDto)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.agreementsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'Get agreement by ID',
    description: 'Returns agreement details by agreement ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Agreement ID' })
  @ApiOkResponse({ description: 'Agreement found', type: AgreementResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Update agreement',
    description: 'Updates selected fields of an agreement',
  })
  @ApiParam({ name: 'id', type: String, description: 'Agreement ID' })
  @ApiOkResponse({
    description: 'Agreement updated successfully',
    type: AgreementResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  @ApiUnprocessableEntityResponse({
    description: 'contractor_id or work_id does not exist',
  })
  update(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ) {
    return this.agreementsService.update(id, updateAgreementDto);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Delete agreement',
    description: 'Deletes an agreement by ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'Agreement ID' })
  @ApiOkResponse({ description: 'Agreement deleted successfully' })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  remove(@Param('id') id: string) {
    return this.agreementsService.remove(id);
  }
}
