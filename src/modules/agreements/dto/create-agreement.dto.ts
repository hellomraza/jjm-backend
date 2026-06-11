import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAgreementDto {
  @ApiProperty({
    description: 'Agreement number',
    example: 'AG-2023-001',
  })
  @IsString()
  @IsNotEmpty()
  agreementno!: string;

  @ApiProperty({
    description: 'Agreement year',
    example: '2023-2024',
  })
  @IsString()
  @IsNotEmpty()
  agreementyear!: string;

  @ApiProperty({
    description: 'Division code',
    example: 'DIST001',
  })
  @IsString()
  @IsNotEmpty()
  division_code!: string;

  @ApiPropertyOptional({
    description: 'AGRID reference ID',
    example: 'agrid-123',
  })
  @IsString()
  @IsOptional()
  agrid?: string;

  @ApiPropertyOptional({
    description: 'Contractor user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  contractor_id?: string;

  @ApiPropertyOptional({
    description: 'SR number',
    example: 'sr-123',
  })
  @IsString()
  @IsOptional()
  sr?: string;

  @ApiPropertyOptional({
    description: 'Work order number',
    example: 'WO-2023-001',
  })
  @IsString()
  @IsOptional()
  workorderno?: string;

  @ApiPropertyOptional({
    description: 'Work order date',
    example: '2023-01-01',
  })
  @IsDateString()
  @IsOptional()
  workorderdate?: string;

  @ApiPropertyOptional({
    description: 'Work item IDs',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  work_ids?: string[];

  @ApiPropertyOptional({
    description: 'Uni-tag identifier',
    example: 'tag-123',
  })
  @IsString()
  @IsOptional()
  unitag?: string;

  @ApiPropertyOptional({
    description: 'Excel file reference name',
    example: 'sheet1.xlsx',
  })
  @IsString()
  @IsOptional()
  excel?: string;

  @ApiPropertyOptional({
    description: 'Security deposit amount',
    example: 10000.00,
  })
  @IsNumber()
  @IsOptional()
  security_deposit?: number;

  @ApiPropertyOptional({
    description: 'Security deposit released amount',
    example: 0.00,
    default: 0.00,
  })
  @IsNumber()
  @IsOptional()
  security_deposit_released?: number;
}
