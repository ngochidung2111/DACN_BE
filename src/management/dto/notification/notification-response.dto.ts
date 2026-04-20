import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NotificationResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty({ example: 'UNREAD' })
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  created_at: Date;
}
