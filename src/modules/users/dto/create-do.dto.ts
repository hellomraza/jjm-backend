import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

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
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'District ID',
    example: 1,
    type: Number,
    required: false,
  })
  district_id?: number;
}
