import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateAnnouncementCommentDto {
  @ApiProperty({ example: 'Thanks for the update!' })
  @IsString()
  @Length(1, 2000)
  comment: string;
}
