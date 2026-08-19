import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkItem } from './work-item.entity';
import { User } from '../../users/entities/user.entity';

export enum BankDetailsStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('work_item_bank_details')
export class WorkItemBankDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  work_item_id!: string;

  @OneToOne(() => WorkItem, (workItem) => workItem.bankDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_item_id' })
  workItem!: WorkItem;

  @Column({ type: 'varchar', length: 255 })
  bank_account_name!: string;

  @Column({ type: 'varchar', length: 50 })
  bank_account_number!: string;

  @Column({ type: 'varchar', length: 15 })
  ifsc_code!: string;

  @Column({ type: 'varchar', length: 100 })
  voucher_number!: string;

  @Column({ type: 'varchar', length: 500 })
  voucher_file_url!: string;

  @Column({
    type: 'enum',
    enum: BankDetailsStatus,
    default: BankDetailsStatus.SUBMITTED,
  })
  status!: BankDetailsStatus;

  @CreateDateColumn({ type: 'datetime' })
  submitted_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  approved_at?: Date | null;

  @Column({ nullable: true })
  approved_by_id?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
