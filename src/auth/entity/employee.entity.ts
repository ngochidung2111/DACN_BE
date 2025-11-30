import { ROLE } from 'src/management/entity/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';
import { GENDER } from './constant';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  lastName: string;

  @Column()
  firstName: string;

  @Column()
  middleName: string;

  @Column()
  gender: GENDER;

  @Column()
  dateOfBirth: Date;

  @Column({ unique: true })
  email: string;

  @Column()
  roles: ROLE;

  @Column()
  password_hash: string;

  @Column({nullable: true})
  phone: string;

  @Column({nullable: true})
  salary: number;

  @ManyToOne(() => Department, (department) => department.employees, { nullable: true })
  department: Department;


}
