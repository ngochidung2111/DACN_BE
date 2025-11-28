import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entity";



@Entity()
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({unique: true})
  name: string;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];
}