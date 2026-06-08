import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Length,
} from 'class-validator';

export class CreateContractorDto {
  @ApiProperty({
    description: 'Unique contractor code (alphanumeric, length 9)',
    example: 'CO1234567',
  })
  @IsString()
  @IsNotEmpty()
  @Length(9, 9)
  @Matches(/^[a-zA-Z0-9]{9}$/, {
    message: 'code must be a 9-character alphanumeric string',
  })
  code: string;

  @ApiProperty({
    description: 'Full name of the contractor',
    example: 'Jane Smith',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique email address for the contractor',
    example: 'contractor@jjm.local',
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

  @ApiPropertyOptional({
    description: 'Mobile phone number (10 digits)',
    example: '9123456789',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile must be a valid 10 digit Indian mobile number',
  })
  mobile?: string;

  @ApiPropertyOptional({
    description: 'PAN number (format: ABCDE1234F)',
    example: 'ABCDE1234F',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
    message:
      'PAN number must follow format: 5 letters, 4 digits, 1 letter (uppercase)',
  })
  pan_number?: string;

  @ApiPropertyOptional({ description: 'District name', example: 'Jaipur' })
  @IsOptional()
  @IsString()
  district_name?: string;

  @ApiPropertyOptional({ description: 'Postal address', example: '...' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'District ID for the contractor',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  district_id?: string;
}
