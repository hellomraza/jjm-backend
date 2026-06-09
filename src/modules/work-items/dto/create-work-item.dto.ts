import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WorkItemStatus } from '../entities/work-item.entity';

export class CreateWorkItemDto {
  @ApiProperty({
    description: 'Work code identifier',
    example: 'W123456789012',
  })
  @IsString()
  @IsNotEmpty()
  work_code!: string;

  @ApiProperty({
    description: 'Scheme type (NVARCHAR 100 equivalent)',
    example: 'PWS',
  })
  @IsString()
  @IsNotEmpty()
  schemetype!: string;

  @ApiPropertyOptional({
    description: 'Work code ID',
    example: 'workcode-123',
  })
  @IsString()
  @IsOptional()
  workcodeid?: string;

  @ApiPropertyOptional({
    description: 'Work item title',
    example: 'Pipeline extension phase 1',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the work item',
    example: 'Laying distribution pipeline for village sector A',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'District Code',
    example: 'DIST001',
  })
  @IsString()
  @IsOptional()
  district_id?: string;

  @ApiPropertyOptional({
    description: 'Block Code',
    example: 'BLK001',
  })
  @IsString()
  @IsOptional()
  block_id?: string;

  @ApiPropertyOptional({
    description: 'Panchayat Code',
    example: 'PAN001',
  })
  @IsString()
  @IsOptional()
  panchayat_id?: string;

  @ApiPropertyOptional({
    description: 'Village Code',
    example: 'VIL001',
  })
  @IsString()
  @IsOptional()
  village_id?: string;

  @ApiPropertyOptional({
    description: 'Subdivision Code',
    example: 'SUB001',
  })
  @IsString()
  @IsOptional()
  subdivision_id?: string;

  @ApiPropertyOptional({
    description: 'Circle Code',
    example: 'CIR001',
  })
  @IsString()
  @IsOptional()
  circle_id?: string;

  @ApiPropertyOptional({
    description: 'Zone Code',
    example: 'ZON001',
  })
  @IsString()
  @IsOptional()
  zone_id?: string;

  @ApiPropertyOptional({
    description: 'Number of FHTC (NVARCHAR 110 equivalent)',
    example: '1250',
  })
  @IsString()
  @IsOptional()
  nofhtc?: string;

  @ApiPropertyOptional({
    description: 'Amount approved (FLOAT 53 equivalent)',
    example: 1250000.5,
  })
  @IsNumber()
  @IsOptional()
  amount_approved?: number;

  @ApiPropertyOptional({
    description: 'Payment amount (FLOAT 53 equivalent)',
    example: 450000.75,
  })
  @IsNumber()
  @IsOptional()
  payment_amount?: number;

  @ApiPropertyOptional({
    description: 'Serial number (INT) / SR',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  sr?: number;

  @ApiPropertyOptional({
    description: 'Agreement ID',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @IsUUID()
  @IsOptional()
  agreement_id?: string;

  @ApiPropertyOptional({
    description: 'Excel file reference name',
    example: 'sheet1.xlsx',
  })
  @IsString()
  @IsOptional()
  excel?: string;

  @ApiPropertyOptional({ description: 'Latitude of work location', example: 25.5941 })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude of work location', example: 85.1376 })
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Initial progress percentage (0-100)',
    minimum: 0,
    maximum: 100,
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progress_percentage?: number;

  @ApiPropertyOptional({
    description: 'Initial work item status',
    enum: WorkItemStatus,
    example: WorkItemStatus.PENDING,
  })
  @IsEnum(WorkItemStatus)
  @IsOptional()
  status?: WorkItemStatus;
}
