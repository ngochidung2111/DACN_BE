import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ASSET_CONDITION, ASSET_TYPE } from './constants';

@Entity()
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: ASSET_TYPE;

  @Column()
  condition: ASSET_CONDITION;

  @Column()
  purchase_date: Date;

  @Column()
  warranty_expiration_date: Date;

  @Column()
  maintenance_schedule: Date;
}
