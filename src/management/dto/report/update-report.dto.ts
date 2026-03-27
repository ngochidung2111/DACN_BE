import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateReportDto {
  @ApiPropertyOptional({
    description: 'What was accomplished this week',
    example: 'Completed feature A, Fixed bug B, Updated documentation',
  })
  @IsString()
  @IsOptional()
  accomplishment?: string;

  @ApiPropertyOptional({
    description: 'What is currently in progress',
    example: 'Working on feature C, Investigating performance issue',
  })
  @IsString()
  @IsOptional()
  in_progress?: string;

  @ApiPropertyOptional({
    description: 'Plans for next week',
    example: 'Start feature D, Code review for feature C, Team meeting',
  })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({
    description: 'Blockers or issues',
    example: 'Waiting for API from backend team',
  })
  @IsString()
  @IsOptional()
  blocker?: string;

  @ApiPropertyOptional({
    description: 'Overall progress percentage (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress_percentage?: number;

  @ApiPropertyOptional({
    description: 'Additional progress notes',
    example: 'Making good progress',
  })
  @IsString()
  @IsOptional()
  progress_notes?: string;
}
