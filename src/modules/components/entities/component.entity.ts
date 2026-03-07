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
import { User } from '../../users/entities/user.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';

export enum ComponentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('components')
@Index('IDX_COMPONENT_WORKITEM_COMPONENT_NO', ['work_item_id', 'component_number'])
@Index('IDX_COMPONENT_WORKITEM_STATUS', ['work_item_id', 'status'])
export class Component {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  work_item_id: number;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @Index()
  @Column()
  component_number: number;

  @Column()
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ComponentStatus,
    default: ComponentStatus.PENDING,
  })
  status: ComponentStatus;

  @Index()
  @Column({ nullable: true })
  approved_by: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({ type: 'datetime', nullable: true })
  approved_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
