import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('district_tpi_assignments')
export class DistrictTpiAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'district_code', type: 'varchar', length: 100 })
  district_code!: string;

  @Column({ name: 'tpi_id', type: 'varchar', length: 36 })
  tpi_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tpi_id' })
  tpi!: User;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ name: 'assigned_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  assigned_at!: Date;

  @Column({ name: 'ended_at', type: 'datetime', nullable: true })
  ended_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
