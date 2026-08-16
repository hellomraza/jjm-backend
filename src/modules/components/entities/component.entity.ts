import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ComponentType {
  SVS = 'SVS',
  TPI = 'TPI',
}

@Entity('components')
@Index('IDX_COMPONENT_TYPE', ['type'])
@Index('IDX_COMPONENT_ORDER_NUMBER', ['order_number'])
export class Component {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ComponentType.SVS,
  })
  type: ComponentType | string;

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
