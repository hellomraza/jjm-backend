import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';
import { WorkItemStatus } from '../../work-items/entities/work-item.entity';
import { Agreement } from '../entities/agreement.entity';
import { AgreementFile } from '../entities/agreement-file.entity';
import { AgreementFileMap } from '../entities/agreement-file-map.entity';

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
    example: 'CG-BAL',
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
    required: false,
    example: 'CG-BAL',
  })
  district_id?: string | null;

  @ApiProperty({
    description: 'Type of scheme under which the work item is categorized',
    example: 'Water Supply',
  })
  schemetype: string;

  @ApiProperty({
    description: 'ID of the contractor responsible for executing the work item',
    example: 'contractor-123',
    nullable: true,
  })
  contractor_id?: string | null;

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

export class AgreementFileResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the attached file',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  id: string;

  @ApiProperty({
    description: 'Public URL of the PDF file',
    example: 'https://cdn.example.com/agreements/file.pdf',
  })
  file_url: string;

  @ApiProperty({
    description: 'File name stored in the system',
    example: 'agreement.pdf',
  })
  file_name: string;

  @ApiProperty({
    description: 'MIME type of the uploaded file',
    example: 'application/pdf',
  })
  mime_type: string;

  @ApiProperty({
    description: 'File size in bytes',
    required: false,
    nullable: true,
    example: 245678,
  })
  file_size?: number | null;

  @ApiProperty({
    description: 'ID of the user who uploaded the file',
    required: false,
    nullable: true,
    example: 'user-123',
  })
  uploaded_by_user_id?: string | null;

  @ApiProperty({
    description: 'Role of the uploader captured at upload time',
    enum: UserRole,
    example: UserRole.HO,
  })
  uploaded_by_role: UserRole;

  @ApiProperty({
    description: 'Timestamp when the file was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the file was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;

  static fromEntity(file: AgreementFile): AgreementFileResponseDto {
    return {
      id: file.id,
      file_url: file.file_url,
      file_name: file.file_name,
      mime_type: file.mime_type,
      file_size: file.file_size,
      uploaded_by_user_id: file.uploaded_by_user_id,
      uploaded_by_role: file.uploaded_by_role,
      created_at: file.created_at,
      updated_at: file.updated_at,
    };
  }
}

export class AgreementFileMapResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the mapping row',
    example: '550e8400-e29b-41d4-a716-446655440200',
  })
  id: string;

  @ApiProperty({
    description: 'Agreement ID linked to the file',
    example: 'agreement-123',
  })
  agreement_id: string;

  @ApiProperty({
    description: 'Agreement file ID linked to the agreement',
    example: 'file-123',
  })
  agreement_file_id: string;

  @ApiProperty({
    description: 'Attached agreement file details',
    type: AgreementFileResponseDto,
    required: false,
    nullable: true,
  })
  agreementFile?: AgreementFileResponseDto;

  @ApiProperty({
    description: 'Timestamp when the mapping was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  static fromEntity(map: AgreementFileMap): AgreementFileMapResponseDto {
    return {
      id: map.id,
      agreement_id: map.agreement_id,
      agreement_file_id: map.agreement_file_id,
      agreementFile: map.agreementFile
        ? AgreementFileResponseDto.fromEntity(map.agreementFile)
        : undefined,
      created_at: map.created_at,
    };
  }
}

export class AgreementFileAttachmentResponseDto {
  @ApiProperty({ type: () => AgreementResponseDto })
  agreement: any;

  @ApiProperty({ type: AgreementFileResponseDto })
  file: AgreementFileResponseDto;

  @ApiProperty({ type: AgreementFileMapResponseDto })
  mapping: AgreementFileMapResponseDto;

  static fromAttachment(attachment: {
    agreement: Agreement;
    file: AgreementFile;
    mapping: AgreementFileMap;
  }): AgreementFileAttachmentResponseDto {
    return {
      agreement: AgreementResponseDto.fromEntity(attachment.agreement),
      file: AgreementFileResponseDto.fromEntity(attachment.file),
      mapping: AgreementFileMapResponseDto.fromEntity(attachment.mapping),
    };
  }
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
    nullable: true,
  })
  contractor_id?: string | null;

  @ApiProperty({
    description: 'Division code',
    example: 'division-123',
  })
  division_code: string;

  @ApiProperty({
    description: 'SR number',
    example: 'sr-123',
    nullable: true,
  })
  sr?: string | null;

  @ApiProperty({
    description: 'Work order number',
    example: 'WO-123',
    nullable: true,
  })
  workorderno?: string | null;

  @ApiProperty({
    description: 'Work order date',
    example: '2026-06-09',
    nullable: true,
  })
  workorderdate?: string | null;

  @ApiProperty({
    description: 'Uni-tag identifier',
    example: 'tag-123',
    nullable: true,
  })
  unitag?: string | null;

  @ApiProperty({
    description: 'AGRID reference ID',
    example: 'agrid-123',
    nullable: true,
  })
  agrid?: string | null;

  @ApiProperty({
    description: 'Excel file reference name',
    example: 'sheet1.xlsx',
    nullable: true,
  })
  excel?: string | null;

  @ApiProperty({
    description: 'Contractor user details',
    type: AgreementContractorResponseDto,
    nullable: true,
  })
  contractor?: AgreementContractorResponseDto;

  @ApiProperty({
    description: 'Work items details',
    type: [AgreementWorkItemResponseDto],
    default: [],
  })
  workItems: AgreementWorkItemResponseDto[];

  @ApiProperty({
    description: 'Attached agreement files',
    type: [AgreementFileResponseDto],
    default: [],
  })
  files: AgreementFileResponseDto[];

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
      division_code: agreement.division_code,
      sr: agreement.sr,
      workorderno: agreement.workorderno,
      workorderdate: agreement.workorderdate,
      unitag: agreement.unitag,
      agrid: agreement.agrid,
      excel: agreement.excel,
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
      workItems: agreement.workItems
        ? agreement.workItems.map((item) => ({
            id: item.id,
            work_code: item.work_code,
            title: item.title,
            description: item.description,
            district_id: item.district_id,
            schemetype: item.schemetype,
            contractor_id: item.contractor_id,
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            progress_percentage: Number(item.progress_percentage),
            status: item.status,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
        : [],
      files:
        agreement.agreementFileMaps?.map((agreementFileMap) =>
          AgreementFileResponseDto.fromEntity(agreementFileMap.agreementFile),
        ) ?? [],
      created_at: agreement.created_at,
      updated_at: agreement.updated_at,
    };
  }
}
