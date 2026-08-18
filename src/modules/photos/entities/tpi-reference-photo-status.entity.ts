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
import { Photo } from './photo.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { Component } from '../../components/entities/component.entity';
import { User } from '../../users/entities/user.entity';

export enum TpiReferencePhotoStatusEnum {
  UPLOADED = 'UPLOADED',
  SELECTED = 'SELECTED',
}

@Entity('tpi_reference_photo_statuses')
@Index('IDX_TPI_REF_PHOTO_STATUS_WORK_COMPONENT', ['work_item_id', 'component_id'])
export class TpiReferencePhotoStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'photo_id', type: 'varchar', length: 36 })
  photo_id!: string;

  @ManyToOne(() => Photo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photo_id' })
  photo!: Photo;

  @Column({ name: 'work_item_id', type: 'varchar', length: 36 })
  work_item_id!: string;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem!: WorkItem;

  @Column({ name: 'component_id' })
  component_id!: string;

  @ManyToOne(() => Component)
  @JoinColumn({ name: 'component_id' })
  component!: Component;

  @Column({
    type: 'enum',
    enum: TpiReferencePhotoStatusEnum,
    default: TpiReferencePhotoStatusEnum.UPLOADED,
  })
  status!: TpiReferencePhotoStatusEnum;

  @Column({ name: 'selected_by', type: 'varchar', length: 36, nullable: true })
  selected_by?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'selected_by' })
  selectedByUser?: User | null;

  @Column({ name: 'selected_at', type: 'datetime', nullable: true })
  selected_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
