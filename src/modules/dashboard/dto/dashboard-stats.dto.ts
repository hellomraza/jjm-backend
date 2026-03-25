import { ApiProperty } from '@nestjs/swagger';

export class WorkItemStatsDto {
  @ApiProperty({
    description: 'Total number of work items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of pending work items',
    example: 50,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of in-progress work items',
    example: 75,
  })
  inProgress: number;

  @ApiProperty({
    description: 'Number of completed work items',
    example: 25,
  })
  completed: number;
}

export class UserStatsDto {
  @ApiProperty({
    description: 'Total number of employees',
    example: 200,
  })
  employees: number;

  @ApiProperty({
    description: 'Total number of contractors',
    example: 30,
  })
  contractors: number;

  @ApiProperty({
    description: 'Total number of district officers',
    example: 20,
  })
  districtOfficers: number;

  @ApiProperty({
    description: 'Total number of head office users',
    example: 5,
  })
  headOffice: number;

  @ApiProperty({
    description: 'Total number of users',
    example: 255,
  })
  total: number;
}

export class WorkItemWithProgressDto {
  @ApiProperty({
    description: 'Work item unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Work item code',
    example: 'WI-001',
  })
  work_code: string;

  @ApiProperty({
    description: 'Work item title',
    example: 'Water Pipeline Construction',
  })
  title: string;

  @ApiProperty({
    description: 'Current status of work item',
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    example: 'IN_PROGRESS',
  })
  status: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 75,
  })
  progress_percentage: number;

  @ApiProperty({
    description: 'Description of the work item',
    example: 'Construction of water pipeline in village X',
  })
  description?: string;
}

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Work item statistics',
    type: WorkItemStatsDto,
  })
  workItems: WorkItemStatsDto;

  @ApiProperty({
    description: 'User statistics by role',
    type: UserStatsDto,
  })
  users: UserStatsDto;

  @ApiProperty({
    description: 'Total number of agreements',
    example: 45,
  })
  totalAgreements: number;

  @ApiProperty({
    description: 'Timestamp when the statistics were generated',
    example: '2026-03-25T10:30:00.000Z',
  })
  generatedAt: Date;
}

export class DistrictDashboardDto {
  @ApiProperty({
    description: 'District name',
    example: 'District Name',
  })
  districtName: string;

  @ApiProperty({
    description: 'Work item statistics for the district',
    type: WorkItemStatsDto,
  })
  workItems: WorkItemStatsDto;

  @ApiProperty({
    description: 'List of work items with their progress',
    type: [WorkItemWithProgressDto],
  })
  workItemsList: WorkItemWithProgressDto[];

  @ApiProperty({
    description: 'Timestamp when the statistics were generated',
    example: '2026-03-25T10:30:00.000Z',
  })
  generatedAt: Date;
}
