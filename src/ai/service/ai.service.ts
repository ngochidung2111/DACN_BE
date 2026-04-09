import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChatResponseDto } from '../dto/chat-response.dto';

type ChatParams = {
  userId: string;
  email?: string;
  roles?: string[] | string;
  message: string;
  sessionId?: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  async chat(params: ChatParams): Promise<ChatResponseDto> {
    const reply = await this.invokeBedrockAgent(params);
    return {
      reply,
      source: 'llm',
    };
  }

  private async invokeBedrockAgent(params: ChatParams): Promise<string> {
    const region = this.configService.get<string>('ai.bedrockRegion') || 'ap-southeast-2';
    const agentId = this.configService.get<string>('ai.bedrockAgentId') || '';
    const agentAliasId = this.configService.get<string>('ai.bedrockAgentAliasId') || '';
    const enableTrace = this.configService.get<boolean>('ai.bedrockEnableTrace') ?? false;

    if (!agentId || !agentAliasId) {
      return 'AI_BEDROCK_AGENT_ID or AI_BEDROCK_AGENT_ALIAS_ID is missing. Please configure Bedrock Agent settings in environment variables.';
    }

    const accessKeyId = this.configService.get<string>('ai.bedrockAccessKeyId');
    const secretAccessKey = this.configService.get<string>('ai.bedrockSecretAccessKey');
    const sessionToken = this.configService.get<string>('ai.bedrockSessionToken');

    const hasExplicitCredentials = Boolean(accessKeyId && secretAccessKey);
    const client = new BedrockAgentRuntimeClient({
      region,
      ...(hasExplicitCredentials
        ? {
            credentials: {
              accessKeyId: accessKeyId!,
              secretAccessKey: secretAccessKey!,
              sessionToken,
            },
          }
        : {}),
    });

    try {
      const response = await client.send(
        new InvokeAgentCommand({
          agentId,
          agentAliasId,
          sessionId: params.sessionId || params.userId,
          inputText: params.message,
          enableTrace,
          sessionState: {
            promptSessionAttributes: {
              userId: params.userId,
              email: params.email || 'unknown',
              roles: this.normalizeRoles(params.roles).join(','),
            },
          },
        }),
      );

      let content = '';
      if (response.completion) {
        for await (const event of response.completion) {
          const chunkBytes = event.chunk?.bytes;
          if (chunkBytes) {
            content += new TextDecoder().decode(chunkBytes);
          }
        }
      }

      return content.trim() || 'No response generated from Bedrock Agent.';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Bedrock Agent error';
      this.logger.error(
        `Bedrock Agent invoke failed for agentId=${agentId}, aliasId=${agentAliasId}, region=${region}: ${message}`,
      );
      throw new InternalServerErrorException('Failed to process Bedrock Agent request');
    }
  }

  private normalizeRoles(roles: unknown): string[] {
    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === 'string' && role.length > 0);
    }

    if (typeof roles === 'string' && roles.length > 0) {
      return [roles];
    }

    if (roles && typeof roles === 'object' && 'name' in (roles as Record<string, unknown>)) {
      const roleName = (roles as Record<string, unknown>).name;
      return typeof roleName === 'string' && roleName.length > 0 ? [roleName] : [];
    }

    return [];
  }
}
