import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateDOStaffDto {
  @ApiPropertyOptional({
    description: 'Full name of the DO staff member',
    example: 'Sunil Verma',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique email address for the DO staff member',
    example: 'dostaff@jjm.local',
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
  @ValidateIf(
    (o) => o.password !== undefined && o.password !== null && o.password !== '',
  )
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
}
