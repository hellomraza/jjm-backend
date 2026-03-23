import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Block } from '../../locations/entities/block.entity';
import { Circle } from '../../locations/entities/circle.entity';
import { District } from '../../locations/entities/district.entity';
import { Panchayat } from '../../locations/entities/panchayat.entity';
import { Subdivision } from '../../locations/entities/subdivision.entity';
import { Village } from '../../locations/entities/village.entity';
import { Zone } from '../../locations/entities/zone.entity';

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
  @Column({ type: 'int' })
  district_id: number;

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

  @ManyToOne(() => District, { nullable: true })
  @JoinColumn({ name: 'district_id', referencedColumnName: 'districtid' })
  district?: District;

  @ManyToOne(() => Block, { nullable: true })
  @JoinColumn({ name: 'block_id', referencedColumnName: 'blockid' })
  block?: Block;

  @ManyToOne(() => Panchayat, { nullable: true })
  @JoinColumn({ name: 'panchayat_id', referencedColumnName: 'panchayatid' })
  panchayat?: Panchayat;

  @ManyToOne(() => Village, { nullable: true })
  @JoinColumn({ name: 'village_id', referencedColumnName: 'villageid' })
  village?: Village;

  @ManyToOne(() => Subdivision, { nullable: true })
  @JoinColumn({ name: 'subdivision_id', referencedColumnName: 'subdivisionid' })
  subdivision?: Subdivision;

  @ManyToOne(() => Circle, { nullable: true })
  @JoinColumn({ name: 'circle_id', referencedColumnName: 'circleid' })
  circle?: Circle;

  @ManyToOne(() => Zone, { nullable: true })
  @JoinColumn({ name: 'zone_id', referencedColumnName: 'zoneid' })
  zone?: Zone;

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
