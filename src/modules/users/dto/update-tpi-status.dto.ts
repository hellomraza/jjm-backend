import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateTpiStatusDto {
  @ApiProperty({
    description: 'Active status of the TPI',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
