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
    description: 'Work item title',
    example: 'Pipeline extension phase 1',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the work item',
    example: 'Laying distribution pipeline for village sector A',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'District ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  district_id: string;

  @ApiPropertyOptional({
    description: 'Block ID',
    example: 101,
  })
  @IsInt()
  @IsOptional()
  block_id?: number;

  @ApiPropertyOptional({
    description: 'Panchayat ID',
    example: 201,
  })
  @IsInt()
  @IsOptional()
  panchayat_id?: number;

  @ApiPropertyOptional({
    description: 'Village ID',
    example: 301,
  })
  @IsInt()
  @IsOptional()
  village_id?: number;

  @ApiPropertyOptional({
    description: 'Subdivision ID',
    example: 401,
  })
  @IsInt()
  @IsOptional()
  subdivision_id?: number;

  @ApiPropertyOptional({
    description: 'Circle ID',
    example: 501,
  })
  @IsInt()
  @IsOptional()
  circle_id?: number;

  @ApiPropertyOptional({
    description: 'Zone ID',
    example: 601,
  })
  @IsInt()
  @IsOptional()
  zone_id?: number;

  @ApiProperty({
    description: 'Scheme type (NVARCHAR 100 equivalent)',
    example: 'PWS',
  })
  @IsString()
  @IsNotEmpty()
  schemetype: string;

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
    description: 'Serial number (INT)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  serial_no?: number;

  @ApiProperty({
    description: 'Contractor user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  contractor_id: string;

  @ApiProperty({ description: 'Latitude of work location', example: 25.5941 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude of work location', example: 85.1376 })
  @IsLongitude()
  longitude: number;

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
