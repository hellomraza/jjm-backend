import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class LoginUserResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the logged-in user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Role of the logged-in user',
    enum: UserRole,
    example: UserRole.DO,
  })
  role: UserRole;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Basic logged-in user details',
    type: LoginUserResponseDto,
  })
  user: LoginUserResponseDto;
}
