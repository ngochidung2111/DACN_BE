import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { TICKET_STATUS, TICKET_CATEGORY } from '../entity/constants';
import { Type } from 'class-transformer';
export class QueryTicketDto {
  @ApiPropertyOptional({
    description: 'Filter by ticket status',
    enum: TICKET_STATUS,
  })
  @IsEnum(TICKET_STATUS)
  @IsOptional()
  status?: TICKET_STATUS;

  @ApiPropertyOptional({
    description: 'Filter by ticket category',
    enum: TICKET_CATEGORY,
  })
  @IsEnum(TICKET_CATEGORY)
  @IsOptional()
  category?: TICKET_CATEGORY;

  @ApiPropertyOptional({
    description: 'Filter by employee who created ticket',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  employee_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned employee',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  assignee_id?: string;

  @ApiPropertyOptional({
    description: 'Search in title and description (case-insensitive)',
    example: 'system access',
  })
  @IsOptional()
  keyword?: string;

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
    example: 'created_at',
    enum: ['created_at', 'updated_at', 'title', 'status'],
  })
  @IsOptional()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
