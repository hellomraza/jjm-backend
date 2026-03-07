import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { WorkItemStatus } from '../entities/work-item.entity';

export class CreateWorkItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  district_id: number;

  @IsNumber()
  contractor_id: number;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progress_percentage?: number;

  @IsEnum(WorkItemStatus)
  @IsOptional()
  status?: WorkItemStatus;
}
