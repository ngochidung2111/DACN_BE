import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ChatHistorySessionsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of sessions to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ChatHistoryMessagesQueryDto {
  @ApiProperty({
    description: 'Chat session identifier',
    example: 'session-employee-123',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Maximum number of messages to return',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
