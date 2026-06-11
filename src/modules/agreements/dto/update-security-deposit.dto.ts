import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateSecurityDepositDto {
  @ApiProperty({
    description: 'Security deposit amount',
    example: 10000.00,
  })
  @IsNumber()
  @Min(0)
  security_deposit!: number;
}
