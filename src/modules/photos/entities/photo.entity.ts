import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkItemComponent } from '../../components/entities/work-item-component.entity';
import { User } from '../../users/entities/user.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';

@Entity('photos')
@Index('IDX_PHOTO_COMPONENT_SELECTED', ['component_id', 'is_selected'])
@Index('IDX_PHOTO_COMPONENT_CREATED_AT', ['component_id', 'created_at'])
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

  @ManyToOne(() => WorkItemComponent)
  @JoinColumn({ name: 'component_id' })
  workItemComponent: WorkItemComponent;

  @Index()
  @Column()
  work_item_id: number;

  @ManyToOne(() => WorkItem)
  @JoinColumn({ name: 'work_item_id' })
  workItem: WorkItem;

  @Index()
  @Column({ default: false })
  is_selected: boolean;

  @Column({ nullable: true })
  selected_by: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'selected_by' })
  selectedByUser: User;

  @Column({ type: 'datetime', nullable: true })
  selected_at: Date | null;

  @Index()
  @Column({ default: false })
  is_forwarded_to_do: boolean;

  @Column({ type: 'datetime', nullable: true })
  forwarded_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
