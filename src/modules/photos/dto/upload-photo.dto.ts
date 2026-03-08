import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
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
    example: 2001,
  })
  @IsNumber()
  @IsNotEmpty()
  component_id: number;

  @ApiProperty({
    description: 'Work item ID associated with this photo',
    example: 101,
  })
  @IsNumber()
  @IsNotEmpty()
  work_item_id: number;

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
