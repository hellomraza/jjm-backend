import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateTpiStaffDto {
  @ApiProperty({
    description: 'Full name of the TPI staff member',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique email address for the staff member',
    example: 'john.doe@bihartpi.local',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password with minimum 8 characters',
    example: 'StaffPass@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
