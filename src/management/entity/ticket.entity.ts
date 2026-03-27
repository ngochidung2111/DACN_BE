import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { TICKET_STATUS } from './constants';
import { TicketCategory } from './ticket-category.entity';
import { TicketProcess } from './ticket-process.entity';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Employee;

  @ManyToOne(() => TicketCategory)
  @JoinColumn({ name: 'category_id' })
  category: TicketCategory;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({default: TICKET_STATUS.OPEN})
  status: TICKET_STATUS;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @OneToMany(() => TicketProcess, (process) => process.ticket)
  processes: TicketProcess[];
}
