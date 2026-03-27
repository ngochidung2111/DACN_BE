import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { REPORT_STATUS } from './constants';

@Entity()
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  week_starting: Date;

  @Column('text')
  accomplishment: string;

  @Column('text')
  in_progress: string;

  @Column('text')
  plan: string;

  @Column('text', { nullable: true })
  blocker: string | null;

  @Column('text', { nullable: true })
  progress_notes: string | null;

  @Column({
    default: REPORT_STATUS.DRAFT,
  })
  status: REPORT_STATUS;

  @Column({ type: 'decimal', precision: 3, scale: 0, default: 0 })
  progress_percentage: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
