import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PaymentDetailAudit } from './entities/payment-detail-audit.entity';
import { PaymentDetail } from './entities/payment-detail.entity';
import { VoucherFile } from './entities/voucher-file.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentDetail,
      PaymentDetailAudit,
      VoucherFile,
      User,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
