import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agreement } from '../../agreements/entities/agreement.entity';
import { Block } from '../../locations/entities/block.entity';
import { Circle } from '../../locations/entities/circle.entity';
import { District } from '../../locations/entities/district.entity';
import { Panchayat } from '../../locations/entities/panchayat.entity';
import { Subdivision } from '../../locations/entities/subdivision.entity';
import { Village } from '../../locations/entities/village.entity';
import { Zone } from '../../locations/entities/zone.entity';
import { User } from '../../users/entities/user.entity';
import { WorkOrderTpiAssignment } from './work-order-tpi-assignment.entity';
import { WorkOrderTpiComponent } from './work-order-tpi-component.entity';

export enum WorkItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('work_order_tpi')
export class WorkOrderTpi {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  work_code!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  district_id!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  block_id?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  panchayat_id?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  village_id?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  subdivision_id?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  circle_id?: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone_id?: string;

  @Column({ type: 'varchar', length: 100, default: 'TPI' })
  schemetype!: string;

  @Column({ type: 'varchar', length: 110, nullable: true, default: null })
  nofhtc?: string;

  @Column({ type: 'double', nullable: true })
  amount_approved?: number;

  @Column({ type: 'double', nullable: true })
  payment_amount?: number;

  @Column({ type: 'int', nullable: true })
  serial_no?: number | null;

  @Index()
  @Column({ nullable: true })
  contractor_id?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractor_id', referencedColumnName: 'id' })
  contractor?: User;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  agreement_id?: string | null;

  @ManyToOne(() => Agreement, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'agreement_id' })
  agreement?: Agreement | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id', referencedColumnName: 'district_code' })
  district?: District;

  @ManyToOne(() => Block, { nullable: true })
  @JoinColumn({ name: 'block_id', referencedColumnName: 'block_code' })
  block?: Block;

  @ManyToOne(() => Panchayat, { nullable: true })
  @JoinColumn({ name: 'panchayat_id', referencedColumnName: 'panchayat_code' })
  panchayat?: Panchayat;

  @ManyToOne(() => Village, { nullable: true })
  @JoinColumn({ name: 'village_id', referencedColumnName: 'village_code' })
  village?: Village;

  @ManyToOne(() => Subdivision, { nullable: true })
  @JoinColumn({
    name: 'subdivision_id',
    referencedColumnName: 'subdivision_code',
  })
  subdivision?: Subdivision;

  @ManyToOne(() => Circle, { nullable: true })
  @JoinColumn({ name: 'circle_id', referencedColumnName: 'circle_code' })
  circle?: Circle;

  @ManyToOne(() => Zone, { nullable: true })
  @JoinColumn({ name: 'zone_id', referencedColumnName: 'zone_code' })
  zone?: Zone;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, default: 0 })
  longitude!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percentage!: number;

  @Column({
    type: 'enum',
    enum: WorkItemStatus,
    default: WorkItemStatus.PENDING,
  })
  status!: WorkItemStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  schemecategory?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  excel?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  workcodeid?: string | null;

  @OneToMany(() => WorkOrderTpiComponent, (comp) => comp.workOrderTpi, {
    cascade: true,
  })
  components?: WorkOrderTpiComponent[];

  @OneToOne(() => WorkOrderTpiAssignment, (assignment) => assignment.workOrderTpi)
  tpiAssignment?: WorkOrderTpiAssignment;
}
