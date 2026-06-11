import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('contractor_bank_details')
export class ContractorBankDetails {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  contractor_id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'contractor_id', referencedColumnName: 'id' })
  contractor!: User;

  @Column({ type: 'varchar', length: 255 })
  account_name!: string;

  @Column({ type: 'varchar', length: 100 })
  account_number!: string;

  @Column({ type: 'varchar', length: 20 })
  ifsc_code!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
