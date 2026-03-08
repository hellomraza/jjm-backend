import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WorkItemComponentStatus } from '../entities/work-item-component.entity';

export class UpdateWorkItemComponentDto {
  @ApiPropertyOptional({
    description: 'Quantity for this component mapping',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Remarks for this component mapping',
    example: 'Material delivered and verified on-site.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiPropertyOptional({
    description: 'Status for this component mapping',
    enum: WorkItemComponentStatus,
    example: WorkItemComponentStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(WorkItemComponentStatus)
  status?: WorkItemComponentStatus;
}
