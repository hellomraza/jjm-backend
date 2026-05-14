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
import { User, UserRole } from '../../users/entities/user.entity';
import { AgreementFileMap } from './agreement-file-map.entity';

@Entity('agreement_files')
@Index('IDX_AGREEMENT_FILES_UPLOADED_BY_USER_ID', ['uploaded_by_user_id'])
export class AgreementFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('UQ_AGREEMENT_FILES_FILE_URL', { unique: true })
  @Column({ type: 'varchar', length: 768 })
  file_url!: string;

  @Column({ type: 'varchar', length: 255 })
  file_name!: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type!: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  file_size?: number | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  uploaded_by_user_id?: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'uploaded_by_user_id', referencedColumnName: 'id' })
  uploadedByUser?: User | null;

  @Column({ type: 'enum', enum: UserRole })
  uploaded_by_role!: UserRole;

  @OneToMany(
    () => AgreementFileMap,
    (agreementFileMap) => agreementFileMap.agreementFile,
  )
  agreementFileMaps?: AgreementFileMap[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
