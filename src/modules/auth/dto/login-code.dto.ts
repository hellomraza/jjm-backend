import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginCodeDto {
  @ApiProperty({
    description: 'User code (userid)',
    example: 'USER001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'User password',
    example: 'Test@1234',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
