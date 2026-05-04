import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User, UserRole } from './user.entity';

@Entity('employee_contracts')
@Unique('UQ_EMPLOYEE_CONTRACTS_CREATED_USER_ID', ['created_user_id'])
@Index('IDX_EMPLOYEE_CONTRACTS_CREATED_BY_ID', ['created_by_id'])
@Index('IDX_EMPLOYEE_CONTRACTS_CREATED_USER_ID', ['created_user_id'])
export class EmployeeContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  created_by_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id', referencedColumnName: 'id' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 36 })
  created_user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_user_id', referencedColumnName: 'id' })
  createdUser!: User;

  @Column({ type: 'enum', enum: UserRole })
  created_by_role!: UserRole;

  @Column({ type: 'enum', enum: UserRole })
  created_user_role!: UserRole;

  @CreateDateColumn()
  created_at!: Date;
}
