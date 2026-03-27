import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTicketCategoryDto {
  @ApiProperty({
    description: 'Ticket category name',
    example: 'IT Support',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Ticket category description',
    example: 'Incidents and requests related to systems and devices',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
