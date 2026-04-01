import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { BOOKING_PATTERN, BOOKING_STATUS } from './constants';
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

  @ManyToMany(() => Employee)
  @JoinTable({
    name: 'booking_attendees',
    joinColumn: { name: 'booking_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' },
  })
  attendees: Employee[];

  @Column()
  start_time: Date;

  @Column()
  end_time: Date;

  @Column()
  purpose: string;

  @Column({ type: 'enum', enum: BOOKING_STATUS })
  status: BOOKING_STATUS;

  @Column({ type: 'enum', enum: BOOKING_PATTERN, nullable: true })
  recurring_pattern?: BOOKING_PATTERN | null; // DAILY, WEEKLY, MONTHLY or null for non-recurring

  @Column({ type: 'datetime', nullable: true })
  recurring_end_date?: Date | null; // End date for recurring bookings

  @Column({ type: 'char', length: 36, nullable: true })
  parent_booking_id?: string | null; // Parent ID if this is a generated recurring booking
}
