import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsString,
} from 'class-validator';

import { BOOKING_STATUS, BOOKING_PATTERN } from '../../entity/constants';

export class UpdateBookingDto {
  @ApiProperty({ enum: BOOKING_STATUS, required: false, description: 'Booking status' })
  @IsEnum(BOOKING_STATUS)
  @IsOptional()
  status?: BOOKING_STATUS;

  @ApiProperty({ description: 'Room ID', required: false })
  @IsUUID()
  @IsOptional()
  room_id?: string;

  @ApiProperty({ description: 'Start time (ISO)', required: false })
  @IsDateString()
  @IsOptional()
  start_time?: string;

  @ApiProperty({ description: 'End time (ISO)', required: false })
  @IsDateString()
  @IsOptional()
  end_time?: string;

  @ApiProperty({ description: 'Purpose of booking', required: false })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiProperty({
    description: 'Replace attendee list by employee IDs (send empty array to clear all)',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attendee_ids?: string[];

  @ApiProperty({ description: 'Recurring pattern', required: false, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @IsEnum(BOOKING_PATTERN)
  @IsOptional()
  recurring_pattern?: BOOKING_PATTERN;

  @ApiProperty({ description: 'End date for recurring booking (ISO)', required: false })
  @IsDateString()
  @IsOptional()
  recurring_end_date?: string;
}
