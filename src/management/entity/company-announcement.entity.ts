import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { ANNOUNCEMENT_CATEGORY } from './constants';
import { AnnouncementInteraction } from './announcement-interaction.entity';

@Entity()
export class CompanyAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @OneToMany(() => AnnouncementInteraction, (interaction) => interaction.announcement)
  interactions: AnnouncementInteraction[];

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('json', { nullable: true })
  image_urls?: string[] | null;

  @Column({ type: 'enum', enum: ANNOUNCEMENT_CATEGORY })
  category: ANNOUNCEMENT_CATEGORY;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;
}
