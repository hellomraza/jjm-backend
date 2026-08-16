import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus } from '../../work-items/entities/work-item.entity';

export class WorkOrderTpiComponentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Inspection: Source & Submersible Pump' })
  name!: string;

  @ApiProperty({ example: 'No.' })
  unit!: string;

  @ApiProperty({ example: 1 })
  order_number!: number;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 0 })
  progress!: number;

  @ApiPropertyOptional({ example: 'Photo confirmed' })
  remarks?: string;

  @ApiPropertyOptional()
  approved_photo_id?: string;

  @ApiPropertyOptional()
  approved_at?: Date;
}

export class WorkOrderTpiResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'TPI123456789012' })
  work_code!: string;

  @ApiProperty({ example: 'TPI Project - Sector 1' })
  title!: string;

  @ApiPropertyOptional({ example: 'Description' })
  description?: string;

  @ApiPropertyOptional({ example: 'DIST001' })
  district_id?: string | null;

  @ApiPropertyOptional({ example: 'BLK001' })
  block_id?: string;

  @ApiPropertyOptional({ example: 'PAN001' })
  panchayat_id?: string;

  @ApiPropertyOptional({ example: 'VIL001' })
  village_id?: string;

  @ApiPropertyOptional({ example: 'TPI' })
  schemetype?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  contractor_id?: string | null;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  agreement_id?: string | null;

  @ApiProperty({ example: 26.9124336 })
  latitude!: number;

  @ApiProperty({ example: 75.7872709 })
  longitude!: number;

  @ApiProperty({ example: 0 })
  progress_percentage!: number;

  @ApiProperty({ enum: WorkItemStatus, example: WorkItemStatus.PENDING })
  status!: WorkItemStatus;

  @ApiPropertyOptional()
  district?: any;

  @ApiPropertyOptional()
  block?: any;

  @ApiPropertyOptional()
  panchayat?: any;

  @ApiPropertyOptional()
  village?: any;

  @ApiPropertyOptional()
  contractor?: any;

  @ApiPropertyOptional()
  agreement?: any;

  @ApiPropertyOptional({ type: [WorkOrderTpiComponentDto] })
  components?: WorkOrderTpiComponentDto[];

  @ApiPropertyOptional()
  tpiAssignment?: any;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  updated_at!: Date;
}
