import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column('simple-array')
  equipment: string[];

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  imageKey?: string;
}
