import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({
    description: 'Week starting date (ISO format)',
    example: '2026-03-23T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  week_starting: string;

  @ApiProperty({
    description: 'What was accomplished this week',
    example: 'Completed feature A, Fixed bug B, Updated documentation',
  })
  @IsString()
  @IsNotEmpty()
  accomplishment: string;

  @ApiProperty({
    description: 'What is currently in progress',
    example: 'Working on feature C, Investigating performance issue',
  })
  @IsString()
  @IsNotEmpty()
  in_progress: string;

  @ApiProperty({
    description: 'Plans for next week',
    example: 'Start feature D, Code review for feature C, Team meeting',
  })
  @IsString()
  @IsNotEmpty()
  plan: string;

  @ApiProperty({
    description: 'Blockers or issues',
    example: 'Waiting for API from backend team, Need access to production database',
    required: false,
  })
  @IsString()
  @IsOptional()
  blocker?: string;

  @ApiProperty({
    description: 'Overall progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress_percentage?: number;

  @ApiProperty({
    description: 'Additional progress notes',
    example: 'Team velocity is higher than expected',
    required: false,
  })
  @IsString()
  @IsOptional()
  progress_notes?: string;
}
