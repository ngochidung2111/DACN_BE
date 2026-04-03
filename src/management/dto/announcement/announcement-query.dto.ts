import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ANNOUNCEMENT_CATEGORY } from '../../entity/constants';

export class AnnouncementQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: ANNOUNCEMENT_CATEGORY })
  @IsOptional()
  @IsEnum(ANNOUNCEMENT_CATEGORY)
  category?: ANNOUNCEMENT_CATEGORY;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: 'meeting' })
  @IsOptional()
  @IsString()
  search?: string;
}
