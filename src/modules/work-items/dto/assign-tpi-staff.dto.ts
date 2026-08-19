import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTpiStaffDto {
  @ApiProperty({
    description: 'TPI Staff user ID to assign to the work item',
    example: 'staff-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  staffId: string;
}
