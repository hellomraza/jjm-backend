import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class UpdatePaymentDetailDto {
  @IsOptional()
  @IsString()
  contractor_name?: string;

  @IsOptional()
  @IsString()
  contractor_code?: string;

  @IsOptional()
  @IsString()
  work_order_code?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  bank_account_number?: string;

  @IsOptional()
  @IsString()
  ifsc_code?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  voucher_number?: string;

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
