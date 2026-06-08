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
  ApiCreatedResponse,
  ApiConflictResponse,
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
import { AttachAgreementFileDto } from './dto/attach-agreement-file.dto';
import {
  AgreementFileAttachmentResponseDto,
  AgreementResponseDto,
} from './dto/agreement-response.dto';
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
  async create(@Body() createAgreementDto: CreateAgreementDto) {
    const agreement = await this.agreementsService.create(createAgreementDto);
    return AgreementResponseDto.fromEntity(agreement);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  @ApiOperation({
    summary: 'List agreements',
    description: 'Returns paginated agreements list with search and filter support',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by agreement number (partial match)',
  })
  @ApiQuery({
    name: 'agreementyear',
    required: false,
    type: String,
    description: 'Filter by agreement year',
  })
  @ApiPaginatedResponse(AgreementResponseDto)
  async findAll(
    @Request() req: { user: { userId: string; role: UserRole } },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('agreementyear') agreementyear?: string,
  ) {
    const result = await this.agreementsService.findAllForUser(
      req.user.userId,
      req.user.role,
      page,
      limit,
      search,
      agreementyear,
    );

    return {
      ...result,
      data: result.data.map((agreement) =>
        AgreementResponseDto.fromEntity(agreement),
      ),
    };
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
  async findOne(
    @Request() req: { user: { userId: string; role: UserRole } },
    @Param('id') id: string,
  ) {
    const agreement = await this.agreementsService.findOneForUser(
      id,
      req.user.userId,
      req.user.role,
    );

    return AgreementResponseDto.fromEntity(agreement);
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
  async update(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
  ) {
    const agreement = await this.agreementsService.update(
      id,
      updateAgreementDto,
    );
    return AgreementResponseDto.fromEntity(agreement);
  }

  @Post(':agreementId/files')
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Attach a PDF file to an agreement',
    description: 'Stores PDF file metadata and links the file to the agreement',
  })
  @ApiParam({ name: 'agreementId', type: String, description: 'Agreement ID' })
  @ApiCreatedResponse({
    description: 'Agreement file attached successfully',
    type: Object,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({
    description: 'Agreement file already exists or is already attached',
  })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  async attachFile(
    @Param('agreementId') agreementId: string,
    @Body() attachAgreementFileDto: AttachAgreementFileDto,
    @Request() req: { user: { userId: string; role: UserRole } },
  ): Promise<AgreementFileAttachmentResponseDto> {
    const attachment = await this.agreementsService.attachFileToAgreement(
      agreementId,
      attachAgreementFileDto,
      req.user,
    );

    return {
      agreement: AgreementResponseDto.fromEntity(attachment.agreement),
      file: attachment.file,
      mapping: attachment.mapping,
    };
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
