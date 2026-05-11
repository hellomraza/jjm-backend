import { District } from 'src/modules/locations/entities/district.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  HO = 'HO', // Head Office
  DO = 'DO', // District Office
  CO = 'CO', // Contractor
  EM = 'EM', // Employee
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 36, nullable: true })
  auid?: string; // auid

  @Column({ type: 'varchar', length: 255, nullable: true })
  designation?: string; // designation

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractorid?: string; // contractorid

  @Column({ unique: true })
  code!: string; // userid,

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EM })
  role!: UserRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district_id?: string;

  @ManyToOne(() => District, {
    nullable: true,
    onDelete: 'SET NULL',
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'district_id', referencedColumnName: 'district_code' })
  district?: District;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile?: string;

  @Column({
    name: 'pan_number',
    type: 'varchar',
    length: 10,
    nullable: true,
    unique: true,
  })
  pan_number?: string;

  @Column({
    name: 'district_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  district_name?: string; // districtname

  @Column({ type: 'text', nullable: true })
  address?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
