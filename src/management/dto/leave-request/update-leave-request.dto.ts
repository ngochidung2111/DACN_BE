import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Leave start date (ISO)', example: '2026-03-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Leave end date (ISO)', example: '2026-03-12T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Leave reason', example: 'Medical leave' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional description', example: 'Need rest and treatment' })
  @IsOptional()
  @IsString()
  description?: string;
}
