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
import { WorkItem } from './work-item.entity';

@Entity('work_item_employee_assignments')
@Unique('UQ_WORK_ITEM_EMPLOYEE_ASSIGNMENT', ['work_item_id', 'employee_id'])
@Index('IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_WORK_ITEM_ID', ['work_item_id'])
@Index('IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_EMPLOYEE_ID', ['employee_id'])
export class WorkItemEmployeeAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  work_item_id: string;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @Index()
  @Column()
  employee_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @CreateDateColumn()
  created_at: Date;
}
