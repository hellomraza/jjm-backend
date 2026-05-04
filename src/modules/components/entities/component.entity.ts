import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('components')
@Unique('UQ_COMPONENT_ORDER_NUMBER', ['order_number'])
@Index('IDX_COMPONENT_ORDER_NUMBER', ['order_number'])
export class Component {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  unit: string;

  @Column()
  order_number: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
