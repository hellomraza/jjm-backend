import { Equals, IsBoolean } from 'class-validator';

export class VerificationActionDto {
  @IsBoolean()
  @Equals(true, {
    message: 'You must verify that all details are correct as per voucher',
  })
  details_verified!: boolean;

  @IsBoolean()
  @Equals(true, {
    message: 'You must confirm that the entered amount is correct as per voucher',
  })
  amount_verified!: boolean;
}
