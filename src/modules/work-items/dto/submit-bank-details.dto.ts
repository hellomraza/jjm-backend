import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SubmitBankDetailsDto {
  @ApiProperty({
    description: 'Account Holder Name registered with the bank account',
    example: 'M/S Sunrise Builders',
  })
  @IsString()
  @IsNotEmpty()
  bank_account_name!: string;

  @ApiProperty({
    description: 'The bank account number',
    example: '123456789012',
  })
  @IsString()
  @IsNotEmpty()
  bank_account_number!: string;

  @ApiProperty({
    description: 'IFSC Code of the bank branch (11 characters)',
    example: 'ICIC0000104',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC code must be valid (e.g. ICIC0000104)',
  })
  ifsc_code!: string;

  @ApiProperty({
    description: 'Bank Name',
    example: 'State Bank of India',
    required: false,
  })
  @IsString()
  @IsOptional()
  bank_name?: string;

  @ApiProperty({
    description: 'Account Type (Current / Saving / Joint)',
    example: 'Current',
    required: false,
  })
  @IsString()
  @IsOptional()
  account_type?: string;

  @ApiProperty({
    description: 'Bank Address',
    example: 'Main Branch, City Center',
    required: false,
  })
  @IsString()
  @IsOptional()
  bank_address?: string;

  @ApiProperty({
    description: 'Mobile Number',
    example: '9876543210',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiProperty({
    description: 'Email (optional / not mandatory)',
    example: 'contractor@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The voucher identifier number',
    example: 'VCH-2026-904',
  })
  @IsString()
  @IsNotEmpty()
  voucher_number!: string;

  @ApiProperty({
    description: 'Voucher file URL if uploaded directly to Cloudinary/S3',
    example: 'https://res.cloudinary.com/dpaoqr7za/image/upload/...',
    required: false,
  })
  @IsString()
  @IsOptional()
  voucher_file_url?: string;
}
