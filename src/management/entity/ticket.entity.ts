import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../auth/entity/employee.entity';
import { TICKET_CATEGORY, TICKET_STATUS } from './constants';

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

  @Column()
  category: TICKET_CATEGORY;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  status: TICKET_STATUS;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
