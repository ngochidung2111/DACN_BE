import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { BOOKING_PATTERN } from '../entity/constants';

export class CreateBookingDto {
  @ApiProperty({ description: 'Room ID', example: 'a1b2c3' })
  @IsUUID()
  @IsNotEmpty()
  room_id: string;

  @ApiProperty({ description: 'Start time (ISO)', example: '2024-12-12T09:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ description: 'End time (ISO)', example: '2024-12-12T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({ description: 'Purpose of booking', example: 'Weekly planning' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty({
    description: 'Recurring pattern (DAILY, WEEKLY, MONTHLY)',
    example: 'WEEKLY',
    required: false,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
  })
  @IsEnum(BOOKING_PATTERN)
  @IsOptional()
  recurring_pattern?: BOOKING_PATTERN;

  @ApiProperty({
    description: 'End date for recurring booking (ISO)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  recurring_end_date?: string;
}
