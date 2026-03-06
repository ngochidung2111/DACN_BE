import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { ASSET_CONDITION, ASSET_TYPE } from '../entity/constants';

export class UpdateAssetDto {
  @ApiPropertyOptional({ description: 'Asset name', example: 'MacBook Pro 16 M3' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ASSET_TYPE, example: ASSET_TYPE.PUBLIC })
  @IsOptional()
  @IsEnum(ASSET_TYPE)
  type?: ASSET_TYPE;

  @ApiPropertyOptional({
    description: 'Owner employee id (only for PRIVATE assets)',
    example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf',
  })
  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @ApiPropertyOptional({
    description: 'Location (required for PUBLIC assets)',
    example: 'Building B - IT Corner',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ASSET_CONDITION, example: ASSET_CONDITION.USED })
  @IsOptional()
  @IsEnum(ASSET_CONDITION)
  condition?: ASSET_CONDITION;

  @ApiPropertyOptional({ description: 'Purchase date (ISO)', example: '2026-01-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional({ description: 'Warranty expiration date (ISO)', example: '2028-01-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  warranty_expiration_date?: string;

  @ApiPropertyOptional({ description: 'Next maintenance date (ISO)', example: '2026-07-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  maintenance_schedule?: string;
}
