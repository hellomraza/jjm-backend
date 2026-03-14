import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SelectPhotoDto {
  @ApiProperty({
    description: 'Photo ID selected by contractor for submission',
    example: 'de305d54-75b4-431b-adb2-eb6b9e546014',
  })
  @IsUUID()
  @IsNotEmpty()
  photoId: string;
}
