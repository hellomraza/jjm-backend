import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignTpiEmployeeDto {
  @ApiProperty({
    description: 'Array of employee user IDs to assign to the TPI work order',
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  employee_ids!: string[];
}
