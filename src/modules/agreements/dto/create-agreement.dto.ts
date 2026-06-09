import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class CreateAgreementDto {
  @ApiProperty({
    description: 'Contractor user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  contractor_id: string;

  @ApiProperty({
    description: 'Work item IDs',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  work_ids: string[];

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
    example: 'DIST001',
  })
  division_code: string;

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
