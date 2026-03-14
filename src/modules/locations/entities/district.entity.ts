import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn({ type: 'int' })
  districtid: number;

  @Column({ type: 'varchar', length: 255 })
  districtname: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  district_code: string;
}
