import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { ANNOUNCEMENT_CATEGORY, INTERACTION_TYPE } from '../../entity/constants';

class AnnouncementEmployeeDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  middleName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'Nguyen Van A',
  })
  @Expose()
  @Transform(({ obj }) => [obj?.firstName, obj?.middleName, obj?.lastName].filter(Boolean).join(' '), {
    toClassOnly: true,
  })
  fullName?: string;
}

class AnnouncementCommentEmployeeDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  middleName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @Expose()
  @Transform(({ obj }) => [obj?.firstName, obj?.middleName, obj?.lastName].filter(Boolean).join(' '), {
    toClassOnly: true,
  })
  fullName?: string;
}

export class AnnouncementCommentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ enum: INTERACTION_TYPE })
  @Expose()
  interaction_type: INTERACTION_TYPE;

  @ApiPropertyOptional()
  @Expose()
  comment?: string | null;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty({ type: AnnouncementCommentEmployeeDto })
  @Expose()
  @Type(() => AnnouncementCommentEmployeeDto)
  employee: AnnouncementCommentEmployeeDto;
}

export class AnnouncementResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ type: AnnouncementEmployeeDto })
  @Expose()
  @Type(() => AnnouncementEmployeeDto)
  employee: AnnouncementEmployeeDto;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  image_urls?: string[] | null;

  @ApiProperty({ enum: ANNOUNCEMENT_CATEGORY })
  @Expose()
  category: ANNOUNCEMENT_CATEGORY;

  @ApiProperty()
  @Expose()
  pinned: boolean;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty({ example: 3 })
  @Expose()
  likeCount: number;

  @ApiProperty({ example: 2 })
  @Expose()
  commentCount: number;

  @ApiProperty({ example: false })
  @Expose()
  likedByMe: boolean;

  @ApiPropertyOptional({ type: [AnnouncementCommentResponseDto] })
  @Expose()
  @Type(() => AnnouncementCommentResponseDto)
  comments?: AnnouncementCommentResponseDto[];
}

export class AnnouncementToggleLikeResponseDto {
  @ApiProperty({ example: true })
  @Expose()
  liked: boolean;

  @ApiProperty({ example: 4 })
  @Expose()
  likeCount: number;
}
