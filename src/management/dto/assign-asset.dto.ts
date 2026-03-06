import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AssignAssetDto {
  @ApiProperty({ description: 'Employee id to assign this PRIVATE asset', example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf' })
  @IsUUID()
  employeeId: string;

  @ApiPropertyOptional({ description: 'Assignment date (ISO), default now', example: '2026-03-06T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  assignmentDate?: string;
}
