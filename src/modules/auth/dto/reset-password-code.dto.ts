import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordCodeDto {
  @ApiProperty({
    description: 'User code of the user',
    example: 'USER001',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: '6-digit OTP code received via email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({
    description: 'New password to set for the user',
    example: 'Password@123',
  })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
