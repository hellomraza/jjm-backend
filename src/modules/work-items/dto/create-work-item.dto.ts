import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
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
