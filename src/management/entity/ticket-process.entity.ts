import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { TICKET_STATUS } from './constants';
import { Ticket } from './ticket.entity';

export enum TICKET_PROCESS_TYPE {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMMENT = 'COMMENT',
}

@Entity()
export class TicketProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.processes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Employee;

  @Column()
  type: TICKET_PROCESS_TYPE;
  
  @Column('text', { nullable: true })
  note: string;

  @Column()
  created_at: Date;

  @Column({default: TICKET_STATUS.OPEN})
  status: TICKET_STATUS;
  
}
