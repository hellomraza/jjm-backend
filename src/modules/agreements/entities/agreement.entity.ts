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
  agreementno: string; // agreementno

  @Column({ type: 'varchar', length: 9 })
  agreementyear: string; //agreementyear

  @Index()
  @Column({ type: 'varchar', length: 36 })
  contractor_id: string; //contractor_code

  @Index()
  @Column({ type: 'varchar', length: 36 })
  work_id: string; // workcode

  // workorderno. workorderdate, sr, excel, unitag, agrid

  @Column({ type: 'varchar', length: 20, nullable: true })
  workorderno: string; // workorderno

  @Column({ type: 'date', nullable: true })
  workorderdate: Date; // workorderdate

  @Column({ type: 'varchar', length: 20, nullable: true })
  sr: string; // sr

  @Column({ type: 'varchar', length: 255, nullable: true })
  excel: string; // excel

  @Column({ type: 'varchar', length: 20, nullable: true })
  unitag: string; // unitag

  @Column({ type: 'varchar', length: 36, nullable: true })
  agrid: string; // agrid

  @Column({ type: 'int', nullable: true })
  division_code: number; //division_code

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

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
