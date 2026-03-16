import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty({ required: false, example: 1 })
  districtid?: number;

  @ApiProperty({ required: false, example: 'Patna' })
  districtname?: string;

  @ApiProperty({ required: false, example: 'DIST-001' })
  district_code?: string;

  @ApiProperty({ required: false, example: 1 })
  blockid?: number;

  @ApiProperty({ required: false, example: 'Phulwari' })
  blockname?: string;

  @ApiProperty({ required: false, example: 'BLK-001' })
  block_code?: string;

  @ApiProperty({ required: false, example: 1 })
  panchayatid?: number;

  @ApiProperty({ required: false, example: 'Rampur' })
  panchayatname?: string;

  @ApiProperty({ required: false, example: 'PAN-001' })
  panchayat_code?: string;

  @ApiProperty({ required: false, example: 1 })
  villageid?: number;

  @ApiProperty({ required: false, example: 'Village A' })
  villagename?: string;

  @ApiProperty({ required: false, example: 'VIL-001' })
  village_code?: string;

  @ApiProperty({ required: false, example: 1 })
  subdivisionid?: number;

  @ApiProperty({ required: false, example: 'Subdivision A' })
  subdivisionname?: string;

  @ApiProperty({ required: false, example: 'SUB-001' })
  subdivision_code?: string;

  @ApiProperty({ required: false, example: 1 })
  circleid?: number;

  @ApiProperty({ required: false, example: 'Circle A' })
  circlename?: string;

  @ApiProperty({ required: false, example: 'CIR-001' })
  circle_code?: string;

  @ApiProperty({ required: false, example: 1 })
  zoneid?: number;

  @ApiProperty({ required: false, example: 'Zone A' })
  zonename?: string;

  @ApiProperty({ required: false, example: 'ZON-001' })
  zone_code?: string;

  @ApiProperty({
    required: false,
    description: 'Parent district id for district-bound masters',
    example: 1,
  })
  district_id?: number;
}
