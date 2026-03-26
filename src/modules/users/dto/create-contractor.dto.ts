import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateContractorDto {
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
  @MinLength(8)
  password: string;
}
