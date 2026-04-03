import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class AnnouncementListResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] })
  @Expose()
  @Type(() => AnnouncementResponseDto)
  items: AnnouncementResponseDto[];

  @ApiProperty({ example: 10 })
  @Expose()
  total: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 20 })
  @Expose()
  pageSize: number;
}
