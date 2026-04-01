import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { BOOKING_STATUS } from '../../entity/constants';

export class UpdateBookingDto {
  @ApiProperty({ enum: BOOKING_STATUS, required: false, description: 'Booking status' })
  @IsEnum(BOOKING_STATUS)
  @IsOptional()
  status?: BOOKING_STATUS;

  @ApiProperty({
    description: 'Replace attendee list by employee IDs (send empty array to clear all)',
    required: false,
    type: [String],
    example: [
      '6bfc3c51-1e0d-4f27-9a6c-7b32e9f482be',
      'cb0eaf90-20fb-4f30-81a6-484eb1c7ca7b',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attendee_ids?: string[];
}
