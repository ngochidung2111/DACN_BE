import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Department } from '../../auth/entity/department.entity';
import { Ticket } from './ticket.entity';

@Entity()
export class TicketCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ default: true })
  is_active: boolean;

  @ManyToMany(() => Department, (department) => department.ticketCategories)
  departments: Department[];

  @OneToMany(() => Ticket, (ticket) => ticket.category)
  tickets: Ticket[];
}
