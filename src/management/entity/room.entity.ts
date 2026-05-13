import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ROOM_STATUS } from './constants';
import { Booking } from './booking.entity';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Booking, (booking) => booking.room, { cascade: ['remove'] })
  bookings: Booking[];

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

  @Column({ nullable: true })
  location?: string;

  @Column({default: ROOM_STATUS.AVAILABLE})
  status: ROOM_STATUS;
}
