import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({
    description: 'User message for the AI assistant',
    example: 'Show my profile and summarize my current information',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional conversation identifier from client side',
    example: 'session-employee-123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}
