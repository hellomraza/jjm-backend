import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import type { WorkOrderTpi } from '../../work-order-tpi/entities/work-order-tpi.entity';
import { AgreementFileMap } from './agreement-file-map.entity';

@Entity('agreements')
@Index(['agreementno', 'agreementyear', 'contractor_id'])
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  agreementno!: string; // agreementno

  @Column({ type: 'varchar', length: 9 })
  agreementyear!: string; //agreementyear

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  contractor_id?: string | null; //contractor_code



  // workorderno. workorderdate, sr, excel, unitag, agrid

  @Column({ type: 'varchar', length: 20, nullable: true })
  workorderno?: string | null; // workorderno

  @Column({ type: 'date', nullable: true })
  workorderdate?: string | null; // workorderdate

  @Column({ type: 'varchar', length: 20, nullable: true })
  sr?: string | null; // sr

  @Column({ type: 'varchar', length: 255, nullable: true })
  excel?: string | null; // excel

  @Column({ type: 'varchar', length: 255, nullable: true })
  unitag?: string | null; // unitag

  @Column({ type: 'varchar', length: 36, nullable: true })
  agrid?: string | null; // agrid

  @Column({ type: 'varchar', length: 100, nullable: true })
  division_code?: string | null; //division_code

  @Column({ type: 'varchar', length: 100, nullable: true })
  dispatch_no?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dispatch_date?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  already_sent?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', onUpdate: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'contractor_id', referencedColumnName: 'id' })
  contractor?: User | null;

  @OneToMany(() => WorkItem, (workItem) => workItem.agreement)
  workItems?: WorkItem[];

  @OneToMany('WorkOrderTpi', 'agreement')
  workOrderTpis?: WorkOrderTpi[];

  @OneToMany(
    () => AgreementFileMap,
    (agreementFileMap) => agreementFileMap.agreement,
  )
  agreementFileMaps?: AgreementFileMap[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
