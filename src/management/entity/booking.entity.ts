import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { BOOKING_STATUS } from './constants';
import { Room } from './room.entity';

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
  recurring_pattern: string; // DAILY, WEEKLY, MONTHLY or null for non-recurring

  @Column({ nullable: true })
  recurring_end_date: Date; // End date for recurring bookings

  @Column({ nullable: true })
  parent_booking_id: string; // Parent ID if this is a generated recurring booking
}
