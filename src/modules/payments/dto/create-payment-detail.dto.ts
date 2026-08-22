import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePaymentDetailDto {
  @IsNotEmpty()
  @IsString()
  contractor_name!: string;

  @IsNotEmpty()
  @IsString()
  contractor_code!: string;

  @IsNotEmpty()
  @IsString()
  work_order_code!: string;

  @IsNotEmpty()
  @IsString()
  bank_name!: string;

  @IsNotEmpty()
  @IsString()
  bank_account_number!: string;

  @IsNotEmpty()
  @IsString()
  ifsc_code!: string;

  @IsNotEmpty()
  @IsString()
  branch!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsNotEmpty()
  @IsString()
  voucher_number!: string;

  @IsOptional()
  @IsString()
  voucher_file_url?: string;

  @IsOptional()
  @IsString()
  voucher_file_id?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsNumber()
  file_size?: number;

  @IsOptional()
  @IsString()
  cheque_number?: string;
}
