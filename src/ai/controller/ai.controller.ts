import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatHistoryMessagesQueryDto, ChatHistorySessionsQueryDto } from '../dto/chat-history-query.dto';

import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { AiService } from '../service/ai.service';
import { ChatHistoryService } from '../service/chat-history.service';

@ApiTags('AI')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

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
    });

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'AI response generated successfully',
      data,
    });
  }

  @Get('chat-history/sessions')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user chat sessions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved successfully',
  })
  async getChatSessions(@Request() req: any, @Query() query: ChatHistorySessionsQueryDto) {
    const data = await this.chatHistoryService.getUserSessions(req.user.userId, query.limit ?? 20);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Chat sessions retrieved successfully',
      data,
    });
  }

  @Get('chat-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get messages in a chat session' })
  @ApiQuery({ name: 'sessionId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
  })
  async getChatHistory(@Request() req: any, @Query() query: ChatHistoryMessagesQueryDto) {
    const data = await this.chatHistoryService.getSessionHistory(
      req.user.userId,
      query.sessionId,
      query.limit ?? 50,
    );

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Chat history retrieved successfully',
      data,
    });
  }

  @Delete('chat-history/sessions/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Clear a chat session for current user' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Chat session cleared successfully',
  })
  async clearChatSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    await this.chatHistoryService.clearSession(req.user.userId, sessionId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Chat session cleared successfully',
      data: null,
    });
  }

  @Delete('chat-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Clear all chat history for current user' })
  @ApiResponse({
    status: 200,
    description: 'All chat history cleared successfully',
  })
  async clearAllChatHistory(@Request() req: any) {
    await this.chatHistoryService.clearAllSessions(req.user.userId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'All chat history cleared successfully',
      data: null,
    });
  }
}
