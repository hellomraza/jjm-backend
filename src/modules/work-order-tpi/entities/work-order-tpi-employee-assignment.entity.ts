import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkOrderTpi } from './work-order-tpi.entity';

@Entity('work_order_tpi_employee_assignments')
@Unique('UQ_WORK_ORDER_TPI_EMPLOYEE_ASSIGNMENT', [
  'work_order_tpi_id',
  'employee_id',
])
@Index('IDX_WORK_ORDER_TPI_EMPLOYEE_ASSIGNMENT_WO_ID', ['work_order_tpi_id'])
@Index('IDX_WORK_ORDER_TPI_EMPLOYEE_ASSIGNMENT_EMP_ID', ['employee_id'])
export class WorkOrderTpiEmployeeAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  work_order_tpi_id!: string;

  @ManyToOne(() => WorkOrderTpi, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'work_order_tpi_id' })
  workOrderTpi!: WorkOrderTpi;

  @Column()
  employee_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @CreateDateColumn()
  created_at!: Date;
}
