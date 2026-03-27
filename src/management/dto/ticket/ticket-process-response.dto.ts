import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TICKET_STATUS } from '../../entity/constants';

export class EmployeeMinimalProcessDto {
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

export class TicketProcessResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440100' })
  @Expose()
  id: string;

  @ApiProperty({ type: EmployeeMinimalProcessDto })
  @Expose()
  @Type(() => EmployeeMinimalProcessDto)
  actor: EmployeeMinimalProcessDto | null;

  @ApiPropertyOptional({ type: EmployeeMinimalProcessDto })
  @Expose()
  @Type(() => EmployeeMinimalProcessDto)
  assignee: EmployeeMinimalProcessDto | null;

  @ApiProperty({
    enum: ['CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'COMMENT'],
    example: 'STATUS_CHANGED',
  })
  @Expose()
  type: string;

  @ApiPropertyOptional({ enum: TICKET_STATUS, example: 'OPEN' })
  @Expose()
  from_status: TICKET_STATUS | null;

  @ApiPropertyOptional({ enum: TICKET_STATUS, example: 'IN_PROGRESS' })
  @Expose()
  to_status: TICKET_STATUS | null;

  @ApiPropertyOptional({ example: 'Assigned to IT team' })
  @Expose()
  note: string | null;

  @ApiProperty({ example: '2026-03-24T10:30:00Z' })
  @Expose()
  created_at: Date;
}

export class TicketTimelineResponseDto {
  @ApiProperty({ type: [TicketProcessResponseDto] })
  @Expose()
  @Type(() => TicketProcessResponseDto)
  processes: TicketProcessResponseDto[];

  @ApiProperty({ example: 8 })
  @Expose()
  total_activities: number;
}
