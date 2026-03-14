import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class CreateAgreementDto {
  @ApiProperty({
    description: 'Agreement number / work order number',
    example: 'AG-2024-001',
  })
  @IsString()
  @IsNotEmpty()
  agreementno: string;

  @ApiProperty({
    description: 'Agreement year range in YYYY-YYYY format',
    example: '2024-2025',
  })
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'agreementyear must be in YYYY-YYYY format',
  })
  agreementyear: string;

  @ApiProperty({
    description: 'Contractor user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  contractor_id: string;

  @ApiProperty({
    description: 'Work item ID',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @IsUUID()
  work_id: string;
}
