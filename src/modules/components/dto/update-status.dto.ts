import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ComponentStatus } from '../entities/component.entity';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Target component status',
    enum: ComponentStatus,
    example: ComponentStatus.IN_PROGRESS,
  })
  @IsEnum(ComponentStatus)
  @IsNotEmpty()
  status: ComponentStatus;
}
