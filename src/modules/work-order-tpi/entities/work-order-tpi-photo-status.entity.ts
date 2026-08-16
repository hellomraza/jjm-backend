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
import { PhotoStatusEnum } from '../../photos/entities/photo-status.entity';
import { User } from '../../users/entities/user.entity';
import { WorkOrderTpiComponent } from './work-order-tpi-component.entity';
import { WorkOrderTpiPhoto } from './work-order-tpi-photo.entity';
import { WorkOrderTpi } from './work-order-tpi.entity';

@Entity('work_order_tpi_photo_statuses')
@Index('IDX_TPI_PHOTO_STATUS_PHOTO_ID', ['photo_id'])
@Index('IDX_TPI_PHOTO_STATUS_WO_ID', ['work_order_tpi_id'])
@Index('IDX_TPI_PHOTO_STATUS_COMP_ID', ['component_id'])
@Index('IDX_TPI_PHOTO_STATUS_STATUS', ['status'])
export class WorkOrderTpiPhotoStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  photo_id!: string;

  @ManyToOne(() => WorkOrderTpiPhoto, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'photo_id' })
  photo!: WorkOrderTpiPhoto;

  @Index()
  @Column()
  work_order_tpi_id!: string;

  @ManyToOne(() => WorkOrderTpi, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'work_order_tpi_id' })
  workOrderTpi!: WorkOrderTpi;

  @Index()
  @Column()
  component_id!: string;

  @ManyToOne(() => WorkOrderTpiComponent, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'component_id' })
  workOrderTpiComponent!: WorkOrderTpiComponent;

  @Index()
  @Column({
    type: 'enum',
    enum: PhotoStatusEnum,
    default: PhotoStatusEnum.UPLOADED,
  })
  status!: PhotoStatusEnum;

  @Column({ nullable: true })
  selected_by?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_by' })
  selectedByUser?: User | null;

  @Column({ type: 'datetime', nullable: true })
  selected_at?: Date | null;

  @Column({ nullable: true })
  approved_by?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser?: User | null;

  @Column({ type: 'datetime', nullable: true })
  approved_at?: Date | null;

  @Column({ nullable: true })
  rejected_by?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by' })
  rejectedByUser?: User | null;

  @Column({ type: 'datetime', nullable: true })
  rejected_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
