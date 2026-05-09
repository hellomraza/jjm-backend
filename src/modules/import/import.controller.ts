import {
  BadRequestException,
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ImportService } from './import.service';

@ApiTags('Import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload and read an Excel file',
    description: 'Accepts an .xlsx file and parses it in the backend for preview',
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
    file: Express.Multer.File,
  ) {
    return this.importService.parseWorkbook(file);
  }
}