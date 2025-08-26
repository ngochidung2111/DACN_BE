import { ROLE } from 'src/management/entity/constants';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column('simple-array')
  roles: ROLE[];

  @Column()
  password_hash: string;
}
