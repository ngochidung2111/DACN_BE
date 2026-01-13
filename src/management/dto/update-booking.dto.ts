import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateBookingDto } from './create-booking.dto';
import { BOOKING_STATUS } from '../entity/constants';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiProperty({ enum: BOOKING_STATUS, required: false, description: 'Booking status' })
  @IsEnum(BOOKING_STATUS)
  @IsOptional()
  status?: BOOKING_STATUS;
}
