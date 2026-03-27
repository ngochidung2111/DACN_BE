import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { REPORT_STATUS } from '../../entity/constants';
import { Type } from 'class-transformer';

export class QueryReportDto {
  @ApiPropertyOptional({
    description: 'Filter by employee ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  employee_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by report status',
    enum: REPORT_STATUS,
  })
  @IsEnum(REPORT_STATUS)
  @IsOptional()
  status?: REPORT_STATUS;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO format)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO format)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'week_starting',
    enum: ['week_starting', 'created_at', 'updated_at', 'status'],
  })
  @IsOptional()
  sort_by?: string = 'week_starting';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
