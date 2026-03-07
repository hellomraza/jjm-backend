import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateComponentDto {
  @IsNumber()
  @IsNotEmpty()
  work_item_id: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  component_number: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}
