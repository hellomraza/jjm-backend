import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateComponentDto {
  @ApiProperty({
    description: 'Parent work item ID',
    example: 101,
  })
  @IsNumber()
  @IsNotEmpty()
  work_item_id: number;

  @ApiProperty({
    description: 'Sequential component number within work item',
    minimum: 1,
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  component_number: number;

  @ApiProperty({
    description: 'Component name',
    example: 'Main pipeline trenching',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
