import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({
    description: 'User message for the AI assistant',
    example: 'Show my profile and summarize my current information',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}
