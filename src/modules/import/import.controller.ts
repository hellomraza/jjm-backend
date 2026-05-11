import {
  BadRequestException,
  Body,
  Controller,
  ParseEnumPipe,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgreementsService } from '../agreements/agreements.service';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { WorkItemsService } from '../work-items/work-items.service';
import {
  type AgreementImport,
  ImportService,
  ImportType,
  type ImportUploadFile,
  type WorkItemImport,
} from './import.service';

@ApiTags('Import')
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly usersService: UsersService,
    private readonly agreementsService: AgreementsService,
    private readonly workItemsService: WorkItemsService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HO, UserRole.DO)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload and read an Excel file',
    description:
      'Accepts an .xlsx file and parses it in the backend for preview (HO only)',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ImportType,
    description:
      'Type of workbook to parse. Supported: agreement, workitem, contractor.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel workbook (.xlsx)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Workbook parsed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid or unsupported file upload' })
  upload(
    @Query('type', new ParseEnumPipe(ImportType)) type: ImportType,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(spreadsheetml\.sheet|xlsx)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          exceptionFactory: () =>
            new BadRequestException('file must be a valid .xlsx workbook'),
        }),
    )
    file: ImportUploadFile,
  ) {
    return this.importService.parseWorkbook(file, type);
  }

  @Post('contractors/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Bulk insert contractors from parsed rows (HO only)',
  })
  @ApiBody({
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  async bulkInsertContractors(@Body('contractors') contractors: unknown[]) {
    return this.usersService.bulkCreateContractorsFromImport(
      contractors as Record<string, any>[],
    );
  }

  @Post('agreements/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HO, UserRole.DO)
  @ApiOperation({
    summary: 'Bulk insert agreements from imported rows (HO only)',
  })
  @ApiBody({
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  async bulkInsertAgreements(
    @Body('agreements') agreements: AgreementImport[],
  ) {
    return this.agreementsService.bulkCreateFromImport(agreements);
  }

  @Post('work-items/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Bulk insert work items from imported rows (HO only)',
  })
  @ApiBody({
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  async bulkInsertWorkItems(@Body('workItems') workItems: WorkItemImport[]) {
    return this.workItemsService.bulkCreateFromImport(workItems);
  }
}
