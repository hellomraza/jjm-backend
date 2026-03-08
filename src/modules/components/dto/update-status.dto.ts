import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { WorkItemComponentStatus } from '../entities/work-item-component.entity';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Target work item component status',
    enum: WorkItemComponentStatus,
    example: WorkItemComponentStatus.IN_PROGRESS,
  })
  @IsEnum(WorkItemComponentStatus)
  @IsNotEmpty()
  status: WorkItemComponentStatus;
}
