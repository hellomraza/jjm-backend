import { ApiProperty } from '@nestjs/swagger';
import { WorkItemComponentStatus } from '../entities/work-item-component.entity';

export class ComponentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for master component',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Component display name', example: 'Earth Work' })
  name: string;

  @ApiProperty({ description: 'Measurement unit', example: 'm3' })
  unit: string;

  @ApiProperty({ description: 'Display order number', example: 1 })
  order_number: number;

  @ApiProperty({
    description: 'Timestamp when the component was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the component was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;
}

export class WorkItemComponentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for work item component mapping',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Work item ID',
    example: 'work-item-123',
  })
  work_item_id: string;

  @ApiProperty({
    description: 'Master component ID',
    example: 'component-123',
  })
  component_id: string;

  @ApiProperty({
    description: 'Total quantity assigned to this component in work item',
    required: false,
    example: 100,
  })
  quantity?: number;

  @ApiProperty({
    description: 'Current progress value for this component',
    example: 25,
  })
  progress: number;

  @ApiProperty({
    description: 'Additional remarks for this component mapping',
    required: false,
    nullable: true,
    example: 'Initial trenching completed',
  })
  remarks?: string | null;

  @ApiProperty({
    description: 'Current workflow status',
    enum: WorkItemComponentStatus,
    example: WorkItemComponentStatus.IN_PROGRESS,
  })
  status: WorkItemComponentStatus;

  @ApiProperty({
    description: 'Selected/approved photo ID',
    required: false,
    nullable: true,
    example: 'photo-123',
  })
  approved_photo_id?: string | null;

  @ApiProperty({
    description: 'Timestamp when the mapping was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the mapping was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Related master component details',
    required: false,
    type: ComponentResponseDto,
  })
  component?: ComponentResponseDto;
}

export class ActionResponseDto {
  @ApiProperty({
    description: 'Success status of the operation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human readable action message',
    example: 'Photo selected and submitted for approval',
  })
  message: string;
}
