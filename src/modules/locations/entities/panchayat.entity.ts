import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('panchayats')
export class Panchayat {
  @PrimaryGeneratedColumn({ type: 'int' })
  panchayatid: number;

  @Column({ type: 'varchar', length: 255 })
  panchayatname: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  panchayat_code: string;
}
