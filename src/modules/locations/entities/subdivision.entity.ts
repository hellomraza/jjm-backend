import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subdivisions')
export class Subdivision {
  @PrimaryGeneratedColumn({ type: 'int' })
  subdivisionid: number;

  @Column({ type: 'varchar', length: 255 })
  subdivisionname: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  subdivision_code: string;
}
