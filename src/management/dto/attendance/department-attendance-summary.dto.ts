import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DepartmentAttendanceEmployeeDto {
  @ApiProperty({ description: 'Employee ID', example: 'b1b3d4b3-9a2e-4a5b-8f0b-6c6d7b0ed111' })
  employeeId: string;

  @ApiProperty({ description: 'Employee email', example: 'employee@example.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'An' })
  firstName: string;

  @ApiProperty({ description: 'Middle name', example: 'Van', nullable: true })
  middleName: string | null;

  @ApiProperty({ description: 'Last name', example: 'Nguyen' })
  lastName: string;

  @ApiProperty({ description: 'Department ID', example: '0d0c4f40-1fd2-4e36-9f7c-6f0e3dc0ac11' })
  departmentId: string;

  @ApiProperty({ description: 'Department name', example: 'Human Resources' })
  departmentName: string;

  @ApiProperty({ description: 'Total on-time days in the month', example: 18 })
  onTimeDays: number;

  @ApiProperty({ description: 'Total late days in the month', example: 2 })
  lateDays: number;

  @ApiProperty({ description: 'Total approved leave days in the month', example: 6 })
  absentDays: number;
}

export class DepartmentAttendanceSummaryResponseDto {
  @ApiProperty({ description: 'Department ID', example: '0d0c4f40-1fd2-4e36-9f7c-6f0e3dc0ac11' })
  departmentId: string;

  @ApiProperty({ description: 'Department name', example: 'Human Resources' })
  departmentName: string;

  @ApiProperty({ description: 'Target year', example: 2026 })
  year: number;

  @ApiProperty({ description: 'Target month', example: 4 })
  month: number;

  @ApiProperty({ description: 'Total employees in department', example: 12 })
  totalEmployees: number;

  @ApiProperty({ description: 'Total calendar days in month', example: 30 })
  totalDays: number;

  @ApiProperty({ description: 'Total on-time day records across the department', example: 210 })
  totalOnTimeDays: number;

  @ApiProperty({ description: 'Total late day records across the department', example: 8 })
  totalLateDays: number;

  @ApiProperty({ description: 'Total approved leave days across the department in the month', example: 142 })
  totalAbsentDays: number;

  @ApiProperty({ type: [DepartmentAttendanceEmployeeDto] })
  @Type(() => DepartmentAttendanceEmployeeDto)
  employees: DepartmentAttendanceEmployeeDto[];
}