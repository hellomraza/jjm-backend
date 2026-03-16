import { ApiProperty } from '@nestjs/swagger';

export enum WorkItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class WorkItemResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the work item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique code for the work item',
    example: 'WI-2024-0001',
  })
  work_code: string;

  @ApiProperty({
    description: 'Title of the work item',
    example: 'Road Construction',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the work item',
    example: 'Construction of a new road connecting village A to village B',
  })
  description?: string;

  @ApiProperty({
    description: 'ID of the district to which the work item belongs',
    example: 'district-123',
  })
  district_id: string;

  @ApiProperty({
    description: 'ID of the block to which the work item belongs',
    example: 101,
  })
  block_id?: number;

  @ApiProperty({
    description: 'ID of the panchayat to which the work item belongs',
    example: 201,
  })
  panchayat_id?: number;

  @ApiProperty({
    description: 'ID of the village to which the work item belongs',
    example: 301,
  })
  village_id?: number;

  @ApiProperty({
    description: 'ID of the subdivision to which the work item belongs',
    example: 401,
  })
  subdivision_id?: number;

  @ApiProperty({
    description: 'ID of the circle to which the work item belongs',
    example: 501,
  })
  circle_id?: number;

  @ApiProperty({
    description: 'ID of the zone to which the work item belongs',
    example: 601,
  })
  zone_id?: number;

  @ApiProperty({
    description: 'Type of scheme under which the work item is categorized',
    example: 'Water Supply',
  })
  schemetype: string;

  @ApiProperty({
    description:
      'No of FHTC (Functional Household Tap Connections) associated with the work item',
    example: '150',
  })
  nofhtc?: string;

  @ApiProperty({
    description: 'Approved amount for the work item',
    example: 5000000,
  })
  amount_approved?: number;

  @ApiProperty({
    description: 'Payment amount released for the work item',
    example: 2000000,
  })
  payment_amount?: number;

  @ApiProperty({
    description: 'Serial number for ordering the work items',
    example: 1,
  })
  serial_no?: number;

  @ApiProperty({
    description: 'ID of the contractor responsible for executing the work item',
    example: 'contractor-123',
  })
  contractor_id: string;

  @ApiProperty({
    description: 'Latitude coordinate of the work item location',
    example: 28.7041,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate of the work item location',
    example: 77.1025,
  })
  longitude: number;

  @ApiProperty({
    description: 'Progress percentage of the work item',
    example: 75,
  })
  progress_percentage: number;

  @ApiProperty({
    description: 'Current status of the work item',
    example: WorkItemStatus.IN_PROGRESS,
  })
  status: WorkItemStatus;

  @ApiProperty({
    description: 'Timestamp when the work item was created',
    example: '2024-01-01T12:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the work item was last updated',
    example: '2024-01-15T15:30:00Z',
  })
  updated_at: Date;
}
