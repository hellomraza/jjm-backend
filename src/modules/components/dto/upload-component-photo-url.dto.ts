import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';
import { UploadComponentPhotoDto } from './upload-component-photo.dto';

export class UploadComponentPhotoUrlDto extends UploadComponentPhotoDto {
  @ApiProperty({
    description: 'Public Cloudinary URL of the uploaded photo',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  photoUrl: string;
}
