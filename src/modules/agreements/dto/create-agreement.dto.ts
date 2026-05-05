import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateAgreementDto {
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

  @ApiProperty({
    description: 'Agreement number',
    example: 'AG-2023-001',
  })
  agreementno: string;

  @ApiProperty({
    description: 'Agreement year',
    example: '2023',
  })
  agreementyear: string;

  @ApiProperty({
    description: 'Division code',
    example: 1,
  })
  division_code: number;

  @ApiProperty({
    description: 'Work order number',
    example: 'WO-2023-001',
  })
  workorderno: string;

  @ApiProperty({
    description: 'Work order date',
    example: '2023-01-01',
  })
  workorderdate: Date;
}
