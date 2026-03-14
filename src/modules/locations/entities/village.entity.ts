import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('villages')
export class Village {
  @PrimaryGeneratedColumn({ type: 'int' })
  villageid: number;

  @Column({ type: 'varchar', length: 255 })
  villagename: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  village_code: string;

  @Index()
  @Column({ type: 'int' })
  district_id: number;
}
