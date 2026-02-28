import { Employee } from 'src/auth/entity/employee.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PAYROLL_STATUS {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
}

@Entity()
@Index('IDX_PAYROLL_EMPLOYEE_MONTH_UNIQUE', ['employeeId', 'year', 'month'], { unique: true })
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, (employee) => employee.payrolls, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basicSalarySnapshot: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  workedHours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  allowance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  deduction: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netSalary: number;

  @Column({ type: 'enum', enum: PAYROLL_STATUS, default: PAYROLL_STATUS.DRAFT })
  status: PAYROLL_STATUS;

  @Column({ nullable: true })
  finalizedAt: Date;

  @Column({ nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}