import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateContractorStatusDto {
  @ApiProperty({
    description: 'Contractor active status',
    example: true,
  })
  @IsBoolean()
  is_active!: boolean;
}
