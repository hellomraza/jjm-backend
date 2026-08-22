import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('voucher_files')
export class VoucherFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  file_url!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name?: string | null;

  @Column({ type: 'int', nullable: true })
  file_size?: number | null;

  @Column({ type: 'varchar', length: 100, default: 'application/pdf' })
  mime_type!: string;

  @Column({ type: 'varchar', length: 100 })
  uploaded_by_id!: string;

  @Column({ type: 'varchar', length: 50 })
  uploaded_by_role!: string;

  @CreateDateColumn()
  created_at!: Date;
}
