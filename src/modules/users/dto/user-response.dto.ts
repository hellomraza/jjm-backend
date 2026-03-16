import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique generated code for the user',
    example: 'DO123456789012',
  })
  code: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Display name of the user',
    example: 'Aman Kumar',
  })
  name: string;

  @ApiProperty({
    description: 'Role assigned to the user',
    enum: UserRole,
    example: UserRole.DO,
  })
  role: UserRole;

  @ApiProperty({
    description: 'District identifier for district-bound users',
    required: false,
    nullable: true,
    example: 'district-001',
  })
  district_id?: string | null;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2026-03-07T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2026-03-08T12:15:00.000Z',
  })
  updated_at: Date;
}
