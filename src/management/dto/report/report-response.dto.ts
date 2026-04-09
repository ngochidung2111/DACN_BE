import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { REPORT_STATUS } from '../../entity/constants';
import { EmployeeMinimalDto } from '../ticket';


export class ReportResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.employee?.id)
  @ApiProperty()
  employee_id: string;

  @Expose()
  @ApiProperty({
    description: 'Week starting date',
    example: '2026-03-23T00:00:00Z',
  })
  week_starting: Date;

  @Expose()
  @ApiProperty({
    description: 'What was accomplished',
  })
  accomplishment: string;

  @Expose()
  @ApiProperty({
    description: 'What is in progress',
  })
  in_progress: string;

  @Expose()
  @ApiProperty({
    description: 'Plans for next week',
  })
  plan: string;

  @Expose()
  @ApiProperty({
    description: 'Blockers or issues',
    required: false,
  })
  blocker: string;

  @Expose()  
  @Transform(({ obj }) => {
    if (obj.employee) {
      return {
        id: obj.employee.id,
        firstName: obj.employee.firstName,
        middleName: obj.employee.middleName,
        lastName: obj.employee.lastName,
        email: obj.employee.email,
      };
    }
  })
  employee: EmployeeMinimalDto;

  @Expose()
  @ApiProperty({
    description: 'Progress percentage',
    example: 75,
  })
  progress_percentage: number;

  @Expose()
  @ApiProperty({
    description: 'Additional progress notes',
    required: false,
  })
  progress_notes: string;

  @Expose()
  @ApiProperty({
    description: 'Report status',
    enum: REPORT_STATUS,
  })
  status: REPORT_STATUS;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;
}

export class ReportListResponseDto {
  @Expose()
  @ApiProperty({ isArray: true, type: ReportResponseDto })
  data: ReportResponseDto[];

  @Expose()
  @ApiProperty()
  total: number;

  @Expose()
  @ApiProperty()
  page: number;

  @Expose()
  @ApiProperty()
  limit: number;

  @Expose()
  @ApiProperty()
  total_pages: number;
}
