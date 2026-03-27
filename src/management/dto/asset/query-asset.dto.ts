import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import { ASSET_CONDITION, ASSET_TYPE } from '../../entity/constants';

export class QueryAssetDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: ASSET_TYPE, example: ASSET_TYPE.PUBLIC })
  @IsOptional()
  @IsEnum(ASSET_TYPE)
  type?: ASSET_TYPE;

  @ApiPropertyOptional({ enum: ASSET_CONDITION, example: ASSET_CONDITION.NEW })
  @IsOptional()
  @IsEnum(ASSET_CONDITION)
  condition?: ASSET_CONDITION;

  @ApiPropertyOptional({ description: 'Filter by owner employee id', example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf' })
  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by location keyword for PUBLIC assets', example: 'Building A' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Search by asset name', example: 'MacBook' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
