import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { AssetResponseDto } from './asset-response.dto';

export class AssetListResponseDto {
  @ApiProperty({ type: [AssetResponseDto] })
  @Expose()
  @Type(() => AssetResponseDto)
  items: AssetResponseDto[];

  @ApiProperty({ example: 25 })
  @Expose()
  total: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 20 })
  @Expose()
  pageSize: number;
}
