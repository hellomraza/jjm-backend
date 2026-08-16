import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

export class CreateWorkOrderTpiDto {
  @ApiProperty({
    description: 'Work code identifier',
    example: 'TPI123456789012',
  })
  @IsString()
  @IsNotEmpty()
  work_code!: string;

  @ApiProperty({
    description: 'Scheme type (e.g. TPI, PWS)',
    example: 'TPI',
    default: 'TPI',
  })
  @IsString()
  @IsNotEmpty()
  schemetype!: string;

  @ApiPropertyOptional({
    description: 'Work code ID',
    example: 'tpicode-123',
  })
  @IsString()
  @IsOptional()
  workcodeid?: string;

  @ApiPropertyOptional({
    description: 'Work order title',
    example: 'TPI Inspection Project - Sector 4',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the TPI work order',
    example: 'Independent verification of water supply infrastructure',
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
    description: 'Number of Functional Household Tap Connections',
    example: '150',
  })
  @IsString()
  @IsOptional()
  nofhtc?: string;

  @ApiPropertyOptional({
    description: 'Approved amount in rupees',
    example: 500000.0,
  })
  @IsNumber()
  @IsOptional()
  amount_approved?: number;

  @ApiPropertyOptional({
    description: 'Payment amount in rupees',
    example: 250000.0,
  })
  @IsNumber()
  @IsOptional()
  payment_amount?: number;

  @ApiPropertyOptional({
    description: 'Serial number',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  serial_no?: number;

  @ApiPropertyOptional({
    description: 'Contractor user ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  contractor_id?: string;

  @ApiPropertyOptional({
    description: 'Associated agreement ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  agreement_id?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinates (-90 to 90)',
    example: 26.9124336,
  })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinates (-180 to 180)',
    example: 75.7872709,
  })
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Progress percentage (0 to 100)',
    example: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress_percentage?: number;

  @ApiPropertyOptional({
    description: 'Scheme category',
    example: 'TPI-RURAL',
  })
  @IsString()
  @IsOptional()
  schemecategory?: string;
}
