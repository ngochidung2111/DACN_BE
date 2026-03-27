import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

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
    description: 'Ticket category ID',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsUUID()
  @IsOptional()
  category_id?: string;
}
