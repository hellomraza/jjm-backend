import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordCodeDto {
  @ApiProperty({
    description: 'User code of the user who forgot their password',
    example: 'USER001',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
