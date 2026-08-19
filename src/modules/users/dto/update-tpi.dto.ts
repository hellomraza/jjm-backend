import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateTpiDto {
  @ApiPropertyOptional({
    description: 'Unique TPI code (manually entered)',
    example: 'TPI-PATNA-01',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Full name of the TPI agency',
    example: 'Bihar TPI Services Ltd',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique email address for the TPI',
    example: 'tpi@bihar.gov.in',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Password with minimum 8 characters',
    example: 'StrongPass@123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ description: 'Postal address', example: '...' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Designation of the contact person', example: 'Lead Inspector' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({
    description: 'District code reference for the TPI',
    example: 'DIST-10',
  })
  @IsOptional()
  @IsString()
  district_id?: string;
}
