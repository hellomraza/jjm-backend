import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Agreement } from './agreement.entity';
import { AgreementFile } from './agreement-file.entity';

@Entity('agreement_file_map')
@Unique('UQ_AGREEMENT_FILE_MAP_FILE_ID', ['agreement_file_id'])
@Index('IDX_AGREEMENT_FILE_MAP_AGREEMENT_ID', ['agreement_id'])
@Index('IDX_AGREEMENT_FILE_MAP_FILE_ID', ['agreement_file_id'])
export class AgreementFileMap {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  agreement_id!: string;

  @ManyToOne(() => Agreement, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'agreement_id', referencedColumnName: 'id' })
  agreement!: Agreement;

  @Column({ type: 'varchar', length: 36 })
  agreement_file_id!: string;

  @ManyToOne(() => AgreementFile, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'agreement_file_id', referencedColumnName: 'id' })
  agreementFile!: AgreementFile;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
