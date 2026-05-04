import { ApiProperty } from '@nestjs/swagger';

export class PhotoResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the photo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Public URL of the uploaded photo',
    example:
      'https://bucket.s3.ap-south-1.amazonaws.com/work-items/1/photo.jpg',
  })
  image_url: string;

  @ApiProperty({
    description: 'Latitude where the photo was captured',
    example: 25.5941,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude where the photo was captured',
    example: 85.1376,
  })
  longitude: number;

  @ApiProperty({
    description: 'Timestamp captured on device',
    example: '2026-03-07T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Employee ID who uploaded the photo',
    example: 'employee-123',
  })
  employee_id: string;

  @ApiProperty({
    description: 'Work item component mapping ID',
    example: 'component-map-123',
  })
  component_id: string;

  @ApiProperty({
    description: 'Work item ID',
    example: 'work-item-123',
  })
  work_item_id: string;

  @ApiProperty({
    description: 'Whether this photo is selected by contractor',
    example: false,
  })
  is_selected: boolean;

  @ApiProperty({
    description: 'User ID who selected this photo',
    required: false,
    nullable: true,
    example: 'contractor-123',
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
    description: 'Whether this photo is forwarded to district office',
    example: false,
  })
  is_forwarded_to_do: boolean;

  @ApiProperty({
    description: 'Timestamp when this photo was forwarded',
    required: false,
    nullable: true,
    example: '2026-03-08T12:20:00.000Z',
  })
  forwarded_at?: Date | null;

  @ApiProperty({
    description: 'Timestamp when this record was created',
    example: '2026-03-07T10:35:00.000Z',
  })
  created_at: Date;
}
