import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('circles')
export class Circle {
  @PrimaryGeneratedColumn({ type: 'int' })
  circleid: number;

  @Column({ type: 'varchar', length: 255 })
  circlename: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  circle_code: string;
}
