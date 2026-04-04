import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ANNOUNCEMENT_CATEGORY } from '../../entity/constants';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Company Townhall' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ example: 'We will have a townhall meeting on Friday.' })
  @IsString()
  @Length(1, 5000)
  content: string;

  @ApiProperty({ enum: ANNOUNCEMENT_CATEGORY, example: ANNOUNCEMENT_CATEGORY.GENERAL })
  @IsEnum(ANNOUNCEMENT_CATEGORY)
  category: ANNOUNCEMENT_CATEGORY;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  pinned?: boolean;
}
