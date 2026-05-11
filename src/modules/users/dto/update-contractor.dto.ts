import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateContractorDto {
  @ApiPropertyOptional({
    description: 'Full name of the contractor',
    example: 'Jane Smith',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique email address for the contractor',
    example: 'contractor@jjm.local',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Password with minimum 8 characters (optional on update)',
    example: 'StrongPass@123',
    minLength: 8,
  })
  @IsOptional()
  @ValidateIf((o) => o.password !== undefined && o.password !== null && o.password !== '')
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  password?: string;

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
}
