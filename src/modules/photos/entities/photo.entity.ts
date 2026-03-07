import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Component } from '../../components/entities/component.entity';
import { User } from '../../users/entities/user.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  image_url: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Index()
  @Column()
  employee_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Index()
  @Column()
  component_id: number;

  @ManyToOne(() => Component)
  @JoinColumn({ name: 'component_id' })
  component: Component;

  @Column()
  work_item_id: number;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @CreateDateColumn()
  created_at: Date;
}
