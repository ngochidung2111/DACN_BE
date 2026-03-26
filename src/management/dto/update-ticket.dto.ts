import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TICKET_CATEGORY } from '../entity/constants';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Ticket title',
    example: 'Cannot access system - URGENT',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Ticket description',
    example: 'System access issue affecting work',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Ticket category',
    enum: TICKET_CATEGORY,
    example: 'IT',
  })
  @IsEnum(TICKET_CATEGORY)
  @IsOptional()
  category?: TICKET_CATEGORY;
}
