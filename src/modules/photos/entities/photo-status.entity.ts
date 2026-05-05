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
import { Component } from '../../components/entities/component.entity';
import { User } from '../../users/entities/user.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { Photo } from './photo.entity';

export enum PhotoStatusEnum {
  UPLOADED = 'UPLOADED',
  SELECTED = 'SELECTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('photo_statuses')
@Index('IDX_PHOTO_STATUS_PHOTO_ID', ['photo_id'])
@Index('IDX_PHOTO_STATUS_WORK_ITEM_ID', ['work_item_id'])
@Index('IDX_PHOTO_STATUS_COMPONENT_ID', ['component_id'])
@Index('IDX_PHOTO_STATUS_STATUS', ['status'])
@Index('IDX_PHOTO_STATUS_WORK_COMPONENT', ['work_item_id', 'component_id'])
@Index('IDX_PHOTO_STATUS_WORK_COMPONENT_STATUS', [
  'work_item_id',
  'component_id',
  'status',
])
export class PhotoStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  photo_id: string;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'photo_id' })
  photo: Photo;

  @Index()
  @Column()
  work_item_id: string;

  @ManyToOne(() => WorkItem, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @Index()
  @Column()
  component_id: string;

  @ManyToOne(() => Component, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: Component;

  @Index()
  @Column({
    type: 'enum',
    enum: PhotoStatusEnum,
    default: PhotoStatusEnum.UPLOADED,
  })
  status: PhotoStatusEnum;

  @Column({ nullable: true })
  selected_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_by' })
  selectedByUser: User | null;

  @Column({ type: 'datetime', nullable: true })
  selected_at: Date | null;

  @Column({ nullable: true })
  approved_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User | null;

  @Column({ type: 'datetime', nullable: true })
  approved_at: Date | null;

  @Column({ nullable: true })
  rejected_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by' })
  rejectedByUser: User | null;

  @Column({ type: 'datetime', nullable: true })
  rejected_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
