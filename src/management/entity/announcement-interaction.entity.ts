import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { CompanyAnnouncement } from './company-announcement.entity';
import { INTERACTION_TYPE } from './constants';

@Entity()
export class AnnouncementInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyAnnouncement, (announcement) => announcement.interactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: CompanyAnnouncement;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'enum', enum: INTERACTION_TYPE })
  interaction_type: INTERACTION_TYPE;

  @Column('text', { nullable: true })
  comment?: string | null;

  @CreateDateColumn()
  created_at: Date;
}
