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

@Entity('tpi_staff_relationships')
@Unique('UQ_TPI_STAFF_RELATIONSHIP_STAFF', ['staff_id'])
export class TpiStaffRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tpi_id', type: 'varchar', length: 36 })
  tpi_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tpi_id' })
  tpi!: User;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staff_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff!: User;

  @CreateDateColumn()
  created_at!: Date;
}
