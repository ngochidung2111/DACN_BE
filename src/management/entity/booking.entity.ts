import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './room.entity';
import { Employee } from '../../auth/entity/employee.entity';
import { BOOKING_STATUS } from './constants';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  start_time: Date;

  @Column()
  end_time: Date;

  @Column()
  purpose: string;

  @Column()
  status: BOOKING_STATUS;

  @Column({ nullable: true })
  recurring_id: number;
}
