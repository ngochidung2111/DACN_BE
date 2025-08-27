import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { ANNOUNCEMENT_CATEGORY } from './constants';

@Entity()
export class CompanyAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  category: ANNOUNCEMENT_CATEGORY;

  @Column()
  created_at: Date;

  @Column()
  pinned: boolean;
}
