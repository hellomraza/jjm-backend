import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class UploadTpiReferencePhotoUrlDto {
  @ApiProperty({
    description: 'Public Cloudinary URL of the uploaded photo',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  photoUrl!: string;

  @ApiProperty({
    description: 'Latitude where photo was taken',
    example: 25.5941,
  })
  @IsLatitude()
  @IsNotEmpty()
  latitude!: number;

  @ApiProperty({
    description: 'Longitude where photo was taken',
    example: 85.1376,
  })
  @IsLongitude()
  @IsNotEmpty()
  longitude!: number;

  @ApiProperty({
    description: 'Photo capture timestamp in ISO format',
    example: '2026-03-07T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  timestamp!: Date;

  @ApiProperty({
    description:
      'Work item component mapping ID (optional if passed in URL path)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  component_id?: string;

  @ApiProperty({
    description: 'Work item ID (optional)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  work_item_id?: string;
}
