import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { WorkOrderTpiComponent } from './work-order-tpi-component.entity';
import { WorkOrderTpi } from './work-order-tpi.entity';

@Entity('work_order_tpi_photos')
@Index('IDX_TPI_PHOTO_COMPONENT', ['component_id', 'is_selected'])
@Index('IDX_TPI_PHOTO_WORK_ORDER', ['work_order_tpi_id'])
@Index('IDX_TPI_PHOTO_UPLOADER', ['uploader_id'])
export class WorkOrderTpiPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  image_url!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'datetime' })
  timestamp!: Date;

  @Index()
  @Column()
  uploader_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader!: User;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EM })
  uploader_role!: UserRole;

  @Index()
  @Column()
  component_id!: string;

  @ManyToOne(() => WorkOrderTpiComponent, (comp) => comp.photos, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'component_id' })
  workOrderTpiComponent!: WorkOrderTpiComponent;

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
  @Column({ default: false })
  is_selected!: boolean;

  @Column({ nullable: true })
  selected_by?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_by' })
  selectedByUser?: User | null;

  @Column({ type: 'datetime', nullable: true })
  selected_at?: Date | null;

  @Index()
  @Column({ default: false })
  is_forwarded_to_do!: boolean;

  @Column({ type: 'datetime', nullable: true })
  forwarded_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
