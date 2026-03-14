import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('work_items')
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  work_code: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column()
  district_id: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  block_id?: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  panchayat_id?: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  village_id?: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  subdivision_id?: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  circle_id?: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  zone_id?: number;

  @Column({ type: 'varchar', length: 100 })
  schemetype: string;

  @Column({ type: 'varchar', length: 110, nullable: true, default: null })
  nofhtc?: string;

  @Column({ type: 'double', nullable: true })
  amount_approved?: number;

  @Column({ type: 'double', nullable: true })
  payment_amount?: number;

  @Column({ type: 'int', nullable: true })
  serial_no?: number;

  @Index()
  @Column()
  contractor_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percentage: number;

  @Column({
    type: 'enum',
    enum: WorkItemStatus,
    default: WorkItemStatus.PENDING,
  })
  status: WorkItemStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
