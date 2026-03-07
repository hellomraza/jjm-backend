import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

export class UploadPhotoDto {
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @IsLongitude()
  @IsNotEmpty()
  longitude: number;

  @IsNumber()
  @IsNotEmpty()
  component_id: number;

  @IsNumber()
  @IsNotEmpty()
  work_item_id: number;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  timestamp: Date;
}
