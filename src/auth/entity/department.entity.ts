import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from "./employee.entity";
import { TicketCategory } from '../../management/entity/ticket-category.entity';



@Entity()
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({unique: true})
  name: string;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @ManyToMany(() => TicketCategory, (category) => category.departments)
  @JoinTable({
    name: 'department_ticket_categories',
    joinColumn: { name: 'department_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  ticketCategories: TicketCategory[];
}