import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class UploadComponentPhotoDto {
  @ApiProperty({
    description: 'Completed work progress for this component',
    example: 35.5,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  progress: number;

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
