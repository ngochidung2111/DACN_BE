import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PayrollWorkingDaysResponseDto {
  @ApiProperty({ description: 'Target year', example: 2026 })
  @Expose()
  year: number;

  @ApiProperty({ description: 'Target month', example: 4 })
  @Expose()
  month: number;

  @ApiProperty({ description: 'Number of working days in the month', example: 22 })
  @Expose()
  workingDays: number;
}