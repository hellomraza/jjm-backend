import { ApiProperty } from '@nestjs/swagger';
import { TpiReferencePhotoStatusEnum } from '../entities/tpi-reference-photo-status.entity';

export class TpiReferencePhotoStatusResponseDto {
  @ApiProperty({
    description: 'Unique identifier for status record',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Photo ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  photo_id: string;

  @ApiProperty({
    description: 'Work Item ID',
    example: 'work-item-uuid',
  })
  work_item_id: string;

  @ApiProperty({
    description: 'Component ID',
    example: 'component-uuid',
  })
  component_id: string;

  @ApiProperty({
    description: 'Reference photo status (UPLOADED or SELECTED)',
    enum: TpiReferencePhotoStatusEnum,
    example: 'SELECTED',
  })
  status: TpiReferencePhotoStatusEnum;

  @ApiProperty({
    description: 'TPI User ID who selected this reference photo',
    required: false,
    nullable: true,
    example: 'tpi-uuid',
  })
  selected_by?: string | null;

  @ApiProperty({
    description: 'Timestamp when this photo was selected',
    required: false,
    nullable: true,
    example: '2026-03-08T12:15:00.000Z',
  })
  selected_at?: Date | null;

  @ApiProperty({
    description: 'Timestamp when this record was created',
    example: '2026-03-07T10:35:00.000Z',
  })
  created_at: Date;
}
