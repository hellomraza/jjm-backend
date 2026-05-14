import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class AttachAgreementFileDto {
  @ApiProperty({
    description: 'Public URL of the PDF file to attach',
    example: 'https://cdn.example.com/agreements/AGR-2026-0001.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  fileUrl!: string;

  @ApiPropertyOptional({
    description: 'Friendly file name to store alongside the URL',
    example: 'agreement-AGR-2026-0001.pdf',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the file, must be application/pdf',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 251234,
  })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  fileSize?: number;
}
