import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    description: 'Final assistant reply',
    example: 'Your profile is complete. You can update avatar from the profile page.',
  })
  reply: string;

  @ApiProperty({
    description: 'Source that generated the reply',
    example: 'llm',
  })
  source: 'llm' | 'action';

  @ApiPropertyOptional({
    description: 'Executed action name when source=action',
    example: 'get_my_profile',
  })
  action?: string;
}
