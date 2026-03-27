import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class TransferAssetDto {
  @ApiProperty({ description: 'Employee id to receive asset', example: '11df9f52-8f4e-45e3-bdfa-37389d2f3e6d' })
  @IsUUID()
  toEmployeeId: string;

  @ApiPropertyOptional({ description: 'Transfer date (ISO), default now', example: '2026-03-06T14:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  transferDate?: string;
}
