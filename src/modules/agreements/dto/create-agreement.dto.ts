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
}
