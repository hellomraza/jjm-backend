import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WorkOrderType } from '../../work-items/entities/work-item.entity';

@Entity('components')
@Unique('UQ_COMPONENT_TYPE_ORDER_NUMBER', ['work_order_type', 'order_number'])
@Index('IDX_COMPONENT_TYPE_ORDER_NUMBER', ['work_order_type', 'order_number'])
export class Component {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  unit: string;

  @Column({
    type: 'enum',
    enum: WorkOrderType,
    default: WorkOrderType.SVS,
  })
  work_order_type!: WorkOrderType;

  @Column()
  order_number: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
