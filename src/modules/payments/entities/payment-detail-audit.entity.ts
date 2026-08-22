import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentDetail } from './payment-detail.entity';

@Entity('payment_detail_audits')
export class PaymentDetailAudit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  payment_detail_id!: string;

  @ManyToOne(() => PaymentDetail, (detail) => detail.audits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_detail_id' })
  paymentDetail!: PaymentDetail;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 100 })
  performed_by_id!: string;

  @Column({ type: 'varchar', length: 255 })
  performed_by_name!: string;

  @Column({ type: 'varchar', length: 255 })
  performed_by_email!: string;

  @Column({ type: 'varchar', length: 50 })
  performed_by_role!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_status?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  new_status?: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
