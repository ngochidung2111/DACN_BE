import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryTicketCategoryDto {
  @ApiPropertyOptional({
    description: 'Filter categories available for a specific department',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @IsUUID()
  @IsOptional()
  department_id?: string;
}
