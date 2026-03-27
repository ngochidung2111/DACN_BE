import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by employee id', example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Search by employee name or reason', example: 'medical' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter leave requests from date (ISO)', example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter leave requests to date (ISO)', example: '2026-03-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
