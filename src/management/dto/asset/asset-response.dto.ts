import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { ASSET_CONDITION, ASSET_TYPE } from '../../entity/constants';

export class AssetOwnerDto {
  @ApiProperty({ description: 'Owner employee ID', example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Owner first name', example: 'Nguyen' })
  @Expose()
  firstName: string;

  @ApiPropertyOptional({ description: 'Owner middle name', example: 'Van' })
  @Expose()
  middleName?: string;

  @ApiProperty({ description: 'Owner last name', example: 'A' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Owner email', example: 'user@example.com' })
  @Expose()
  email: string;
}

export class AssetResponseDto {
  @ApiProperty({ description: 'Asset ID', example: 'b1a0f6b4-1eab-4bde-9fd8-1f8f7f1cc111' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Asset name', example: 'MacBook Pro 16' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Unique asset tag', example: 'ASSET-IT-0001' })
  @Expose()
  assetTag?: string | null;

  @ApiPropertyOptional({ description: 'Unique serial number', example: 'SN-MBP16-M3-2026-0001' })
  @Expose()
  serialNumber?: string | null;

  @ApiProperty({ enum: ASSET_TYPE, example: ASSET_TYPE.PRIVATE })
  @Expose()
  type: ASSET_TYPE;

  @ApiPropertyOptional({ type: AssetOwnerDto })
  @Expose()
  @Type(() => AssetOwnerDto)
  owner?: AssetOwnerDto | null;

  @ApiPropertyOptional({ description: 'Asset location', example: 'Building A - Floor 2 - Storage Room' })
  @Expose()
  location?: string | null;

  @ApiProperty({ enum: ASSET_CONDITION, example: ASSET_CONDITION.NEW })
  @Expose()
  condition: ASSET_CONDITION;

  @ApiProperty({ description: 'Purchase date', example: '2026-01-10T00:00:00.000Z' })
  @Expose()
  purchase_date: Date;

  @ApiProperty({ description: 'Warranty expiration date', example: '2028-01-10T00:00:00.000Z' })
  @Expose()
  warranty_expiration_date: Date;

  @ApiProperty({ description: 'Maintenance schedule date', example: '2026-07-10T00:00:00.000Z' })
  @Expose()
  maintenance_schedule: Date;
}
