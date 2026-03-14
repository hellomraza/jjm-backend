import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn({ type: 'int' })
  zoneid: number;

  @Column({ type: 'varchar', length: 255 })
  zonename: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  zone_code: string;
}
