import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateEEDto {
  @ApiProperty({
    description: 'Full name of the executive engineer',
    example: 'Rajesh Sharma',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique email address for the EE',
    example: 'ee@jjm.local',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password with minimum 8 characters',
    example: 'StrongPass@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'District ID',
    example: 'DIST001',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  district_id: string;

  @ApiProperty({
    description: 'Mobile phone number (10 digits)',
    example: '9123456789',
    required: false,
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile must be a valid 10 digit Indian mobile number',
  })
  mobile?: string;
}
