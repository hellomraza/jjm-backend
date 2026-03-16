import { ApiProperty } from '@nestjs/swagger';

export class AgreementResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the agreement',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Agreement number',
    example: 'AGR/2026/001',
  })
  agreementno: string;

  @ApiProperty({
    description: 'Agreement year',
    example: '2025-2026',
  })
  agreementyear: string;

  @ApiProperty({
    description: 'Contractor user ID',
    example: 'contractor-123',
  })
  contractor_id: string;

  @ApiProperty({
    description: 'Work item ID',
    example: 'work-item-123',
  })
  work_id: string;

  @ApiProperty({
    description: 'Timestamp when the agreement was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the agreement was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;
}
