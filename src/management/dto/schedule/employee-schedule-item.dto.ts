import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export enum EMPLOYEE_SCHEDULE_ITEM_TYPE {
  BOOKING = 'BOOKING',
  LEAVE_REQUEST = 'LEAVE_REQUEST',
}

export class EmployeeScheduleItemDto {
  @ApiProperty({ description: 'Item ID' })
  @Expose()
  id: string;

  @ApiProperty({ enum: EMPLOYEE_SCHEDULE_ITEM_TYPE, description: 'Item type' })
  @Expose()
  type: EMPLOYEE_SCHEDULE_ITEM_TYPE;

  @ApiProperty({ description: 'Start time', example: '2026-03-30T09:00:00.000Z' })
  @Expose()
  start_time: Date;

  @ApiProperty({ description: 'End time', example: '2026-03-30T10:00:00.000Z' })
  @Expose()
  end_time: Date;

  @ApiProperty({ description: 'Display title' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Display subtitle', required: false })
  @Expose()
  subtitle?: string;

  @ApiProperty({ description: 'Status', example: 'CONFIRMED' })
  @Expose()
  status: string;
}

export class EmployeeScheduleResponseDto {
  @ApiProperty({ type: [EmployeeScheduleItemDto] })
  @Expose()
  items: EmployeeScheduleItemDto[];

  @ApiProperty({ description: 'Total items', example: 2 })
  @Expose()
  total: number;
}
