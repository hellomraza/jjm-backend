import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentDetailAudit } from './payment-detail-audit.entity';
import { VoucherFile } from './voucher-file.entity';

export enum PaymentDetailStatus {
  DETAILS_FILLED = 'DETAILS_FILLED',
  SEND_TO_DO = 'SEND_TO_DO',
  DO_CHECKED = 'DO_CHECKED',
  SEND_TO_EE = 'SEND_TO_EE',
  EE_CHECKED = 'EE_CHECKED',
  SEND_FOR_RELEASE_PAYMENT = 'SEND_FOR_RELEASE_PAYMENT',
}

@Entity('payment_details')
export class PaymentDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  contractor_name!: string;

  @Column({ type: 'varchar', length: 100 })
  contractor_code!: string;

  @Column({ type: 'varchar', length: 100 })
  work_order_code!: string;

  @Column({ type: 'varchar', length: 255 })
  bank_name!: string;

  @Column({ type: 'varchar', length: 100 })
  bank_account_number!: string;

  @Column({ type: 'varchar', length: 50 })
  ifsc_code!: string;

  @Column({ type: 'varchar', length: 255 })
  branch!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 100 })
  voucher_number!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  voucher_file_url?: string | null;

  @Column({ type: 'uuid', nullable: true })
  voucher_file_id?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cheque_number?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  district_id!: string;

  @Column({
    type: 'enum',
    enum: PaymentDetailStatus,
    default: PaymentDetailStatus.DETAILS_FILLED,
  })
  status!: PaymentDetailStatus;

  @Column({ type: 'boolean', default: false })
  is_deleted!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deleted_by_id?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at?: Date | null;

  @Column({ type: 'varchar', length: 100 })
  created_by_id!: string;

  @Column({ type: 'varchar', length: 50 })
  created_by_role!: string;

  @ManyToOne(() => VoucherFile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voucher_file_id' })
  voucherFile?: VoucherFile | null;

  @OneToMany(() => PaymentDetailAudit, (audit) => audit.paymentDetail, {
    cascade: true,
  })
  audits!: PaymentDetailAudit[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
