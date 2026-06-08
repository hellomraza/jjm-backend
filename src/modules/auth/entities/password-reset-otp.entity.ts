import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('password_reset_otps')
export class PasswordResetOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_PASSWORD_RESET_OTPS_EMAIL')
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  otp_hash!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn()
  created_at!: Date;
}
