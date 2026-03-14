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

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  agreementno: string;

  @Column({ type: 'varchar', length: 9 })
  agreementyear: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  contractor_id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  work_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'contractor_id', referencedColumnName: 'id' })
  contractor: User;

  @ManyToOne(() => WorkItem, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'work_id', referencedColumnName: 'id' })
  work: WorkItem;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
