import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ASSET_CONDITION } from '../../entity/constants';

export class UpdateAssetConditionDto {
  @ApiProperty({ enum: ASSET_CONDITION, example: ASSET_CONDITION.UNDER_MAINTENANCE })
  @IsEnum(ASSET_CONDITION)
  condition: ASSET_CONDITION;
}
