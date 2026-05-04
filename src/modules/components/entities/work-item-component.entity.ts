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
import { Photo } from '../../photos/entities/photo.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { Component } from './component.entity';

export enum WorkItemComponentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('work_item_components')
@Unique('UQ_WORK_ITEM_COMPONENT', ['work_item_id', 'component_id'])
@Index('IDX_WORK_ITEM_COMPONENT_WORK_ITEM_ID', ['work_item_id'])
@Index('IDX_WORK_ITEM_COMPONENT_COMPONENT_ID', ['component_id'])
@Index('IDX_WORK_ITEM_COMPONENT_WORK_ITEM_COMPONENT', [
  'work_item_id',
  'component_id',
])
export class WorkItemComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  work_item_id: string;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @Column()
  component_id: string;

  @ManyToOne(() => Component)
  @JoinColumn({ name: 'component_id' })
  component: Component;

  @OneToMany(() => Photo, (photo) => photo.workItemComponent)
  photos: Photo[];

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  quantity?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({
    type: 'enum',
    enum: WorkItemComponentStatus,
    default: WorkItemComponentStatus.PENDING,
  })
  status: WorkItemComponentStatus;

  @Column({ nullable: true })
  @Index('IDX_WORK_ITEM_COMPONENT_APPROVED_PHOTO_ID')
  approved_photo_id?: string;

  @Column({ type: 'datetime', nullable: true })
  approved_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
