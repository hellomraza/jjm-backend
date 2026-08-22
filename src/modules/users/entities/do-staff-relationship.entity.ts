import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('do_staff_relationships')
@Unique('UQ_DO_STAFF_RELATIONSHIP_DO', ['do_id'])
@Unique('UQ_DO_STAFF_RELATIONSHIP_STAFF', ['staff_id'])
export class DoStaffRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'do_id', type: 'varchar', length: 36 })
  do_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'do_id' })
  do!: User;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staff_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff!: User;

  @CreateDateColumn()
  created_at!: Date;
}
