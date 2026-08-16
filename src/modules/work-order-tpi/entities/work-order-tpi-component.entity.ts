import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Component } from '../../components/entities/component.entity';
import { WorkOrderTpi } from './work-order-tpi.entity';
import { WorkOrderTpiPhoto } from './work-order-tpi-photo.entity';

export enum WorkItemComponentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('work_order_tpi_components')
@Unique('UQ_WORK_ORDER_TPI_COMPONENT', ['work_order_tpi_id', 'order_number'])
@Index('IDX_WORK_ORDER_TPI_COMPONENT_WORK_ORDER_ID', ['work_order_tpi_id'])
export class WorkOrderTpiComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  work_order_tpi_id!: string;

  @ManyToOne(() => WorkOrderTpi, (wo) => wo.components, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'work_order_tpi_id' })
  workOrderTpi!: WorkOrderTpi;

  @Column({ nullable: true })
  component_id?: string;

  @ManyToOne(() => Component, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'component_id' })
  component?: Component;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, default: 'No.' })
  unit!: string;

  @Column({ type: 'int' })
  order_number!: number;

  @OneToMany(() => WorkOrderTpiPhoto, (photo) => photo.workOrderTpiComponent)
  photos?: WorkOrderTpiPhoto[];

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  quantity?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  progress!: number;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({
    type: 'enum',
    enum: WorkItemComponentStatus,
    default: WorkItemComponentStatus.PENDING,
  })
  status!: WorkItemComponentStatus;

  @Column({ nullable: true })
  @Index('IDX_WORK_ORDER_TPI_COMPONENT_APPROVED_PHOTO_ID')
  approved_photo_id?: string;

  @Column({ type: 'datetime', nullable: true })
  approved_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
