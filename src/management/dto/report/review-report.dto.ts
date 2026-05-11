import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReviewReportDto {
  @ApiProperty({
    description: 'Review note for the report',
    example: 'Good progress, but please shorten the blocker section next week.',
  })
  @IsString()
  @IsNotEmpty()
  review: string;
}