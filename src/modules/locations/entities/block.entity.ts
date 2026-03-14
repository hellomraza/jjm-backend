import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blocks')
export class Block {
  @PrimaryGeneratedColumn({ type: 'int' })
  blockid: number;

  @Column({ type: 'varchar', length: 255 })
  blockname: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  block_code: string;

  @Index()
  @Column({ type: 'int' })
  district_id: number;
}
