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
