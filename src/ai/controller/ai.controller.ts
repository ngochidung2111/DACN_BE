import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';

import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { AiService } from '../service/ai.service';

@ApiTags('AI')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @UseGuards(AuthGuard('jwt'))
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({
    status: 201,
    description: 'AI response generated successfully',
    type: ChatResponseDto,
  })
  async chat(@Request() req: any, @Body() body: ChatRequestDto) {
    const data = await this.aiService.chat({
      userId: req.user.userId,
      email: req.user.email,
      roles: req.user.roles,
      message: body.message,
      sessionId: body.sessionId,
    });

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'AI response generated successfully',
      data,
    });
  }
}
