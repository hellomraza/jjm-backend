import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractorBankDetails } from './contractor-bank-details.entity';

@Entity('contractor_beneficiary_accounts')
export class ContractorBeneficiaryAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bnf_name', type: 'varchar', length: 255 })
  bnf_name!: string;

  @Column({ name: 'bnf_nickname', type: 'varchar', length: 255, nullable: true })
  bnf_nickname?: string;

  @Column({ type: 'varchar', length: 36 })
  contractor_bank_details_id!: string;

  @ManyToOne(() => ContractorBankDetails, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'contractor_bank_details_id', referencedColumnName: 'id' })
  contractorBankDetails!: ContractorBankDetails;

  @Column({ name: 'payee_type', type: 'varchar', length: 100 })
  payee_type!: string;

  @Column({ name: 'beneficiary_id', type: 'varchar', length: 100 })
  beneficiary_id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
