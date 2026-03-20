import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignWorkItemEmployeeDto {
  @ApiProperty({
    description: 'Employee user ID to assign to the work item',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @IsUUID()
  employee_id: string;
}

export class WorkItemEmployeeAssignmentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for this assignment',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  id: string;

  @ApiProperty({
    description: 'Assigned work item ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  work_item_id: string;

  @ApiProperty({
    description: 'Assigned employee user ID',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  employee_id: string;

  @ApiProperty({
    description: 'Timestamp when assignment was created',
    example: '2026-03-20T10:30:00.000Z',
  })
  created_at: Date;
}
