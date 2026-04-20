import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { NotificationResponseDto } from './notification-response.dto';

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  @Expose()
  @Type(() => NotificationResponseDto)
  items: NotificationResponseDto[];

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
