import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';
import { WorkItemStatus } from '../../work-items/entities/work-item.entity';
import { Agreement } from '../entities/agreement.entity';

export class AgreementContractorResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the contractor user',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique generated code for the contractor user',
    example: 'CO123456789012',
  })
  code: string;

  @ApiProperty({
    description: 'Email address of the contractor user',
    example: 'contractor@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Display name of the contractor user',
    example: 'Ravi Kumar',
  })
  name: string;

  @ApiProperty({
    description: 'Role assigned to the contractor user',
    enum: UserRole,
    example: UserRole.CO,
  })
  role: UserRole;

  @ApiProperty({
    description: 'District identifier for district-bound users',
    required: false,
    nullable: true,
    example: 'district-001',
  })
  district_id?: string | null;

  @ApiProperty({
    description: 'Timestamp when the contractor user was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the contractor user was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;
}

export class AgreementWorkItemResponseDto {
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
    required: false,
    example: 'Construction of a new road connecting village A to village B',
  })
  description?: string;

  @ApiProperty({
    description: 'ID of the district to which the work item belongs',
    example: 'district-123',
  })
  district_id: string;

  @ApiProperty({
    description: 'Type of scheme under which the work item is categorized',
    example: 'Water Supply',
  })
  schemetype: string;

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
    enum: WorkItemStatus,
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

export class AgreementResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the agreement',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Agreement number',
    example: 'AGR/2026/001',
  })
  agreementno: string;

  @ApiProperty({
    description: 'Agreement year',
    example: '2025-2026',
  })
  agreementyear: string;

  @ApiProperty({
    description: 'Contractor user ID',
    example: 'contractor-123',
  })
  contractor_id: string;

  @ApiProperty({
    description: 'Work item ID',
    example: 'work-item-123',
  })
  work_id: string;

  @ApiProperty({
    description: 'Contractor user details',
    type: AgreementContractorResponseDto,
    nullable: true,
  })
  contractor?: AgreementContractorResponseDto;

  @ApiProperty({
    description: 'Work item details',
    type: AgreementWorkItemResponseDto,
    nullable: true,
  })
  workItem?: AgreementWorkItemResponseDto;

  @ApiProperty({
    description: 'Timestamp when the agreement was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the agreement was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;

  static fromEntity(agreement: Agreement): AgreementResponseDto {
    return {
      id: agreement.id,
      agreementno: agreement.agreementno,
      agreementyear: agreement.agreementyear,
      contractor_id: agreement.contractor_id,
      work_id: agreement.work_id,
      contractor: agreement.contractor
        ? {
            id: agreement.contractor.id,
            code: agreement.contractor.code,
            email: agreement.contractor.email,
            name: agreement.contractor.name,
            role: agreement.contractor.role,
            district_id: agreement.contractor.district_id,
            created_at: agreement.contractor.created_at,
            updated_at: agreement.contractor.updated_at,
          }
        : undefined,
      workItem: agreement.work
        ? {
            id: agreement.work.id,
            work_code: agreement.work.work_code,
            title: agreement.work.title,
            description: agreement.work.description,
            district_id: agreement.work.district_id,
            schemetype: agreement.work.schemetype,
            contractor_id: agreement.work.contractor_id,
            latitude: Number(agreement.work.latitude),
            longitude: Number(agreement.work.longitude),
            progress_percentage: Number(agreement.work.progress_percentage),
            status: agreement.work.status,
            created_at: agreement.work.created_at,
            updated_at: agreement.work.updated_at,
          }
        : undefined,
      created_at: agreement.created_at,
      updated_at: agreement.updated_at,
    };
  }
}
