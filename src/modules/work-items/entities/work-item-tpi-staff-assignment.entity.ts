import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { WorkItem } from './work-item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('work_item_tpi_staff_assignments')
@Unique('UQ_WORK_ITEM_TPI_STAFF_ASSIGNMENT', ['work_item_id', 'staff_id'])
export class WorkItemTpiStaffAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'work_item_id', type: 'varchar', length: 36 })
  work_item_id!: string;

  @ManyToOne(() => WorkItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_item_id' })
  workItem!: WorkItem;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staff_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff!: User;

  @CreateDateColumn()
  created_at!: Date;
}
