import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateDODto {
  @ApiProperty({
    description: 'Full name of the district office manager',
    example: 'Ahmed Khan',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique email address for the DO',
    example: 'do@jjm.local',
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
    required: false,
  })
  @IsString()
  district_id?: string;

  // mobile no
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
