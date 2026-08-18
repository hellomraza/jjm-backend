import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTpiStaffDto {
  @ApiPropertyOptional({
    description: 'Full name of the TPI staff member',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique email address for the staff member',
    example: 'john.doe@bihartpi.local',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Password with minimum 8 characters',
    example: 'StaffPass@123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Activity status of the staff member',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
