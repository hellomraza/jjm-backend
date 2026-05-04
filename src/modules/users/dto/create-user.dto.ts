import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique email address for the user',
    example: 'district.officer@jjm.local',
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
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'District Officer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Role of the user in the system',
    enum: UserRole,
    example: UserRole.DO,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'District ID for district-level users, nullable for HO',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  district_id?: number;

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
    description:
      'PAN number (format: 5 letters, 4 digits, 1 letter). Example: ABCDE1234F',
    example: 'ABCDE1234F',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
    message:
      'PAN number must follow format: 5 letters, 4 digits, 1 letter (uppercase)',
  })
  pan_number?: string;

  @ApiPropertyOptional({
    description: 'District name',
    example: 'Jaipur',
  })
  @IsOptional()
  @IsString()
  district_name?: string;

  @ApiPropertyOptional({
    description: 'Postal address for the user',
    example: '123 Main St, Village, District',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
