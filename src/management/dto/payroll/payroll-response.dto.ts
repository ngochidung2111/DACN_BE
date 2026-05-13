import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PAYROLL_STATUS } from '../../entity/payroll.entity';

export class PayrollEmployeeMinimalDto {
  @ApiProperty({ description: 'Employee ID', example: 'b1b3d4b3-9a2e-4a5b-8f0b-6c6d7b0ed111' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Employee first name', example: 'An' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Employee middle name', example: 'Van', required: false })
  @Expose()
  middleName?: string;

  @ApiProperty({ description: 'Employee last name', example: 'Nguyen' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Employee email', example: 'employee@example.com' })
  @Expose()
  email: string;
}

export class PayrollResponseDto {
  @ApiProperty({ description: 'Payroll ID', example: '6bfc3c51-1e0d-4f27-9a6c-7b32e9f482be' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Employee ID', example: 'b1b3d4b3-9a2e-4a5b-8f0b-6c6d7b0ed111' })
  @Expose()
  employeeId: string;

  @ApiProperty({ type: PayrollEmployeeMinimalDto, description: 'Minimal employee info' })
  @Expose()
  @Type(() => PayrollEmployeeMinimalDto)
  employee: PayrollEmployeeMinimalDto;

  @ApiProperty({ description: 'Target year', example: 2026 })
  @Expose()
  year: number;

  @ApiProperty({ description: 'Target month', example: 4 })
  @Expose()
  month: number;

  @ApiProperty({ description: 'Basic salary snapshot used for payroll', example: 15000000 })
  @Expose()
  basicSalarySnapshot: number;

  @ApiProperty({ description: 'Total worked hours in the month', example: 168 })
  @Expose()
  workedHours: number;

  @ApiProperty({ description: 'Paid leave days counted into salary', example: 2 })
  @Expose()
  paidLeaveDays: number;

  @ApiProperty({ description: 'Paid leave hours counted into salary', example: 16 })
  @Expose()
  paidLeaveHours: number;

  @ApiProperty({ description: 'Unpaid leave days excluded from salary', example: 1 })
  @Expose()
  unpaidLeaveDays: number;

  @ApiProperty({ description: 'Unpaid leave hours excluded from salary', example: 8 })
  @Expose()
  unpaidLeaveHours: number;

  @ApiProperty({ description: 'Total overtime hours', example: 4 })
  @Expose()
  overtimeHours: number;

  @ApiProperty({ description: 'Insurance amount deducted from salary', example: 1575000 })
  @Expose()
  insuranceAmount: number;

  @ApiProperty({ description: 'Allowance amount', example: 0 })
  @Expose()
  allowance: number;

  @ApiProperty({ description: 'Deduction amount', example: 0 })
  @Expose()
  deduction: number;

  @ApiProperty({ description: 'Personal income tax amount', example: 1250000 })
  @Expose()
  taxAmount: number;

  @ApiProperty({ description: 'Gross salary', example: 14000000 })
  @Expose()
  grossSalary: number;

  @ApiProperty({ description: 'Net salary', example: 11175000 })
  @Expose()
  netSalary: number;

  @ApiProperty({ enum: PAYROLL_STATUS, description: 'Payroll status' })
  @Expose()
  status: PAYROLL_STATUS;

  @ApiProperty({ required: false, description: 'When payroll was finalized' })
  @Expose()
  finalizedAt?: Date;

  @ApiProperty({ required: false, description: 'When payroll was paid' })
  @Expose()
  paidAt?: Date;

  @ApiProperty({ required: false, description: 'Created timestamp' })
  @Expose()
  createdAt?: Date;

  @ApiProperty({ required: false, description: 'Updated timestamp' })
  @Expose()
  updatedAt?: Date;
}