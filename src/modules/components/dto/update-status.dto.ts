import { IsEnum, IsNotEmpty } from 'class-validator';
import { ComponentStatus } from '../entities/component.entity';

export class UpdateStatusDto {
  @IsEnum(ComponentStatus)
  @IsNotEmpty()
  status: ComponentStatus;
}
