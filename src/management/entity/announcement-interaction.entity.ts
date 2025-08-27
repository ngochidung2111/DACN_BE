import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { CompanyAnnouncement } from './company-announcement.entity';
import { INTERACTION_TYPE } from './constants';

@Entity()
export class AnnouncementInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyAnnouncement)
  @JoinColumn({ name: 'announcement_id' })
  announcement: CompanyAnnouncement;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  interaction_type: INTERACTION_TYPE;

  @Column('text', { nullable: true })
  comment: string;
}
