import { Employee } from 'src/auth/entity/employee.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ASSET_CONDITION, ASSET_TYPE } from './constants';

@Entity()
@Check("(`type` = 'PRIVATE' AND `location` IS NULL) OR (`type` = 'PUBLIC' AND `owner_employee_id` IS NULL AND `location` IS NOT NULL)")
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: ASSET_TYPE;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'owner_employee_id' })
  owner?: Employee | null;

  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  @Column()
  condition: ASSET_CONDITION;

  @Column({ type: 'datetime' })
  purchase_date: Date;

  @Column({ type: 'datetime' })
  warranty_expiration_date: Date;

  @Column({ type: 'datetime' })
  maintenance_schedule: Date;
}
