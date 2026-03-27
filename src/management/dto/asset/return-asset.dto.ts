import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReturnAssetDto {
  @ApiPropertyOptional({ description: 'Return date (ISO), default now', example: '2026-03-20T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  returnDate?: string;
}
