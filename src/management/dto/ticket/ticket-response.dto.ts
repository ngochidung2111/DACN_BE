import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TICKET_STATUS } from '../../entity/constants';
import { TicketProcessResponseDto } from './ticket-process-response.dto';

export class EmployeeMinimalDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  email: string;
}

export class TicketCategoryMinimalDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440100' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'IT Support' })
  @Expose()
  name: string;
}

export class TicketResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  id: string;

  @ApiProperty({ type: EmployeeMinimalDto })
  @Expose()
  @Type(() => EmployeeMinimalDto)
  employee: EmployeeMinimalDto;

  @ApiPropertyOptional({ type: EmployeeMinimalDto })
  @Expose()
  @Type(() => EmployeeMinimalDto)
  assignee: EmployeeMinimalDto | null;

  @ApiProperty({ type: TicketCategoryMinimalDto })
  @Expose()
  @Type(() => TicketCategoryMinimalDto)
  category: TicketCategoryMinimalDto;

  @ApiProperty({ example: 'Cannot access system' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'I am unable to access the accounting system' })
  @Expose()
  description: string;

  @ApiProperty({ enum: TICKET_STATUS, example: 'OPEN' })
  @Expose()
  status: TICKET_STATUS;

  @ApiProperty({ example: '2026-03-24T10:30:00Z' })
  @Expose()
  created_at: Date;

  @ApiProperty({ example: '2026-03-24T11:45:00Z' })
  @Expose()
  updated_at: Date;

  @ApiPropertyOptional({
    type: [TicketProcessResponseDto],
    description: 'Timeline of processes',
  })
  @Expose()
  @Type(() => TicketProcessResponseDto)
  processes?: TicketProcessResponseDto[];
}

export class TicketListResponseDto {
  @ApiProperty({ type: [TicketResponseDto] })
  @Expose()
  @Type(() => TicketResponseDto)
  items: TicketResponseDto[];

  @ApiProperty({ example: 25 })
  @Expose()
  total: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 10 })
  @Expose()
  limit: number;

  @ApiProperty({ example: 3 })
  @Expose()
  total_pages: number;
}
