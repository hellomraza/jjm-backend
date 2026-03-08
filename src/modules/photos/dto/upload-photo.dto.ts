import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class UploadPhotoDto {
  @ApiProperty({
    description: 'Latitude where photo was taken',
    example: 25.5941,
  })
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    description: 'Longitude where photo was taken',
    example: 85.1376,
  })
  @IsLongitude()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({
    description: 'Work item component mapping ID associated with this photo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  component_id: string;

  @ApiProperty({
    description: 'Work item ID associated with this photo',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  work_item_id: string;

  @ApiProperty({
    description: 'Photo capture timestamp in ISO format',
    example: '2026-03-07T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  timestamp: Date;
}
