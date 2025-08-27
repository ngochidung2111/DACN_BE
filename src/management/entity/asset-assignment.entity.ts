import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from '../../auth/entity/employee.entity';
import { Asset } from './asset.entity';

@Entity()
export class AssetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  assignment_date: Date;

  @Column({ nullable: true })
  return_date: Date;
}
