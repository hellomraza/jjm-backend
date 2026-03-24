import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignWorkItemEmployeeDto {
  @ApiProperty({
    description: 'Array of employee user IDs to assign to the work item',
    example: [
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440011',
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  employee_ids: string[];
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

export class AssignMultipleEmployeesResponseDto {
  @ApiProperty({
    description: 'Array of successfully created assignments',
    type: [WorkItemEmployeeAssignmentResponseDto],
  })
  created: WorkItemEmployeeAssignmentResponseDto[];

  @ApiProperty({
    description:
      'Array of employees that failed to assign (with error reasons)',
    type: [Object],
    example: [
      {
        employee_id: '550e8400-e29b-41d4-a716-446655440010',
        error: 'Employee not found',
      },
    ],
  })
  failed: Array<{ employee_id: string; error: string }>;

  @ApiProperty({
    description: 'Summary of the operation',
    example: { total: 2, created: 1, failed: 1 },
  })
  summary: { total: number; created: number; failed: number };
}
