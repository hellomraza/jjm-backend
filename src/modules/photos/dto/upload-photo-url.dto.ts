import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';
import { UploadPhotoDto } from './upload-photo.dto';

export class UploadPhotoUrlDto extends UploadPhotoDto {
  @ApiProperty({
    description: 'Public Cloudinary URL of the uploaded photo',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  photoUrl: string;
}
