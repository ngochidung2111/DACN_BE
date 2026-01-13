import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BOOKING_STATUS } from '../entity/constants';

class RoomInfoDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  capacity: number;

  @Expose()
  equipment: string[];
}

class EmployeeInfoDto {
  @Expose()
  id: string;

  @Expose() 
  lastName: string;
 
  @Expose() 
  firstName: string;
 
  @Expose() 
  middleName: string;

  @Expose()
  email: string;
}

export class BookingResponseDto {
  @ApiProperty({ description: 'Booking ID', example: '6bfc3c51-1e0d-4f27-9a6c-7b32e9f482be' })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Room info',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'a1b2c3' },
      name: { type: 'string', example: 'Conference Room A' },
      capacity: { type: 'number', example: 12 },
      equipment: { type: 'array', items: { type: 'string' }, example: ['Projector', 'TV'] },
    },
  })
  @Expose()
  @Type(() => RoomInfoDto)
  room: RoomInfoDto;

  @ApiProperty({
    description: 'Employee info',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'emp-01' },
      name: { type: 'string', example: 'Nguyen Van A' },
      email: { type: 'string', example: 'user@example.com' },
    },
  })
  @Expose()
  @Type(() => EmployeeInfoDto)
  employee: EmployeeInfoDto;

  @ApiProperty({ description: 'Start time (ISO)', example: '2024-12-12T09:00:00Z' })
  @Expose()
  start_time: Date;

  @ApiProperty({ description: 'End time (ISO)', example: '2024-12-12T10:00:00Z' })
  @Expose()
  end_time: Date;

  @ApiProperty({ description: 'Purpose of booking', example: 'Weekly planning' })
  @Expose()
  purpose: string;

  @ApiProperty({ enum: BOOKING_STATUS, description: 'Booking status' })
  @Expose()
  status: BOOKING_STATUS;

  @ApiProperty({ required: false, description: 'Created timestamp' })
  @Expose()
  created_at?: Date;

  @ApiProperty({ required: false, description: 'Updated timestamp' })
  @Expose()
  updated_at?: Date;
}
