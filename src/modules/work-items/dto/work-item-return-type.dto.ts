import { ApiProperty } from '@nestjs/swagger';

export enum WorkItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class DistrictDetailsDto {
  @ApiProperty({ example: 10 })
  districtid: number;

  @ApiProperty({ example: 'Patna' })
  districtname: string;

  @ApiProperty({ example: 'DIST-001' })
  district_code: string;
}

export class BlockDetailsDto {
  @ApiProperty({ example: 101 })
  blockid: number;

  @ApiProperty({ example: 'Phulwari' })
  blockname: string;

  @ApiProperty({ example: 'BLK-001' })
  block_code: string;

  @ApiProperty({ example: 10 })
  district_id: number;
}

export class PanchayatDetailsDto {
  @ApiProperty({ example: 201 })
  panchayatid: number;

  @ApiProperty({ example: 'Rampur' })
  panchayatname: string;

  @ApiProperty({ example: 'PAN-001' })
  panchayat_code: string;
}

export class VillageDetailsDto {
  @ApiProperty({ example: 301 })
  villageid: number;

  @ApiProperty({ example: 'Village A' })
  villagename: string;

  @ApiProperty({ example: 'VIL-001' })
  village_code: string;

  @ApiProperty({ example: 10 })
  district_id: number;
}

export class SubdivisionDetailsDto {
  @ApiProperty({ example: 401 })
  subdivisionid: number;

  @ApiProperty({ example: 'Subdivision A' })
  subdivisionname: string;

  @ApiProperty({ example: 'SUB-001' })
  subdivision_code: string;
}

export class CircleDetailsDto {
  @ApiProperty({ example: 501 })
  circleid: number;

  @ApiProperty({ example: 'Circle A' })
  circlename: string;

  @ApiProperty({ example: 'CIR-001' })
  circle_code: string;
}

export class ZoneDetailsDto {
  @ApiProperty({ example: 601 })
  zoneid: number;

  @ApiProperty({ example: 'Zone A' })
  zonename: string;

  @ApiProperty({ example: 'ZON-001' })
  zone_code: string;
}

export class ContractorDetailsDto {
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
    description: 'Name of the contractor',
    example: 'Ravi Kumar',
  })
  name: string;

  @ApiProperty({
    description: 'District ID for the contractor',
    example: 10,
    required: false,
    nullable: true,
  })
  district_id?: number | null;
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
    example: 10,
  })
  district_id: number;

  @ApiProperty({
    description: 'District details mapped from district_id',
    type: DistrictDetailsDto,
    required: false,
    nullable: true,
  })
  district?: DistrictDetailsDto;

  @ApiProperty({
    description: 'ID of the block to which the work item belongs',
    example: 101,
  })
  block_id?: number;

  @ApiProperty({
    description: 'Block details mapped from block_id',
    type: BlockDetailsDto,
    required: false,
    nullable: true,
  })
  block?: BlockDetailsDto;

  @ApiProperty({
    description: 'ID of the panchayat to which the work item belongs',
    example: 201,
  })
  panchayat_id?: number;

  @ApiProperty({
    description: 'Panchayat details mapped from panchayat_id',
    type: PanchayatDetailsDto,
    required: false,
    nullable: true,
  })
  panchayat?: PanchayatDetailsDto;

  @ApiProperty({
    description: 'ID of the village to which the work item belongs',
    example: 301,
  })
  village_id?: number;

  @ApiProperty({
    description: 'Village details mapped from village_id',
    type: VillageDetailsDto,
    required: false,
    nullable: true,
  })
  village?: VillageDetailsDto;

  @ApiProperty({
    description: 'ID of the subdivision to which the work item belongs',
    example: 401,
  })
  subdivision_id?: number;

  @ApiProperty({
    description: 'Subdivision details mapped from subdivision_id',
    type: SubdivisionDetailsDto,
    required: false,
    nullable: true,
  })
  subdivision?: SubdivisionDetailsDto;

  @ApiProperty({
    description: 'ID of the circle to which the work item belongs',
    example: 501,
  })
  circle_id?: number;

  @ApiProperty({
    description: 'Circle details mapped from circle_id',
    type: CircleDetailsDto,
    required: false,
    nullable: true,
  })
  circle?: CircleDetailsDto;

  @ApiProperty({
    description: 'ID of the zone to which the work item belongs',
    example: 601,
  })
  zone_id?: number;

  @ApiProperty({
    description: 'Zone details mapped from zone_id',
    type: ZoneDetailsDto,
    required: false,
    nullable: true,
  })
  zone?: ZoneDetailsDto;

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
    description: 'Contractor details mapped from contractor_id',
    type: ContractorDetailsDto,
    required: false,
    nullable: true,
  })
  contractor?: ContractorDetailsDto;

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
