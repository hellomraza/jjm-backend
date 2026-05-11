import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn({ type: 'int' })
  districtid!: number;

  @Column({ type: 'varchar', length: 255 })
  districtname!: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  district_code!: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  zone_id!: number; // zoneid

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude!: number; // latitude

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude!: number; // longitude
}
