import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkOrderTpi } from './work-order-tpi.entity';

@Entity('work_order_tpi_assignments')
@Unique('UQ_WORK_ORDER_TPI_ASSIGNMENT_WORK_ORDER', ['work_order_tpi_id'])
@Index('IDX_WORK_ORDER_TPI_ASSIGNMENT_WORK_ORDER_ID', ['work_order_tpi_id'])
@Index('IDX_WORK_ORDER_TPI_ASSIGNMENT_TPI_ID', ['tpi_id'])
export class WorkOrderTpiAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  work_order_tpi_id!: string;

  @OneToOne(() => WorkOrderTpi, (wo) => wo.tpiAssignment, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'work_order_tpi_id' })
  workOrderTpi!: WorkOrderTpi;

  @Column()
  tpi_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'tpi_id' })
  tpi!: User;

  @Column({ nullable: true })
  assigned_by_id?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy?: User | null;

  @CreateDateColumn()
  created_at!: Date;
}
