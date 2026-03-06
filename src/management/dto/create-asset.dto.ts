import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { ASSET_CONDITION, ASSET_TYPE } from '../entity/constants';

export class CreateAssetDto {
  @ApiProperty({ description: 'Asset name', example: 'MacBook Pro 16' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ASSET_TYPE, example: ASSET_TYPE.PRIVATE })
  @IsEnum(ASSET_TYPE)
  type: ASSET_TYPE;

  @ApiProperty({
    description: 'Owner employee id, required when type is PRIVATE',
    example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @ApiProperty({
    description: 'Location, required when type is PUBLIC',
    example: 'Building A - Floor 2 - Storage Room',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  @ApiProperty({ enum: ASSET_CONDITION, example: ASSET_CONDITION.NEW })
  @IsEnum(ASSET_CONDITION)
  condition: ASSET_CONDITION;

  @ApiProperty({ description: 'Purchase date (ISO)', example: '2026-01-10T00:00:00.000Z' })
  @IsDateString()
  purchase_date: string;

  @ApiProperty({ description: 'Warranty expiration date (ISO)', example: '2028-01-10T00:00:00.000Z' })
  @IsDateString()
  warranty_expiration_date: string;

  @ApiProperty({ description: 'Next maintenance date (ISO)', example: '2026-07-10T00:00:00.000Z' })
  @IsDateString()
  maintenance_schedule: string;
}
