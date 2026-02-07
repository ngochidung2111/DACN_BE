import { ROLE } from 'src/management/entity/constants';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';
import { GENDER } from './constant';
import { Degree } from './degree.entity';

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
  basicSalary: number;

  @Column({nullable: true})
  grossSalary: number;

  @Column({nullable: true})
  signDate: Date;

  @Column({nullable: true})
  quitDate: Date;

  @Column({nullable: true})
  idCard: string;

  @Column({nullable: true})
  address: string;

  @Column({nullable: true})
  marriedStatus: boolean;

  @Column({nullable: true})
  numberOfChildren: number;

  @Column({nullable: true})
  childrenDescription: string;

  @Column({nullable: true})
  avatarUrl: string;

  @Column({nullable: true})
  avatarKey: string;

  @ManyToOne(() => Department, (department) => department.employees, { nullable: true })
  department: Department;

  @OneToMany(() => Degree, (degree) => degree.employee, { nullable: true })
  degrees: Degree[];
}
