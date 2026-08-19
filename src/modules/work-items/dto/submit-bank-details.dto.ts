import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SubmitBankDetailsDto {
  @ApiProperty({
    description: 'The name registered with the bank account',
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
    description: 'The voucher identifier number',
    example: 'VCH-2026-904',
  })
  @IsString()
  @IsNotEmpty()
  voucher_number!: string;
}
