import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatHistory } from '../entity/chat-history.entity';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatHistory)
    private chatHistoryRepository: Repository<ChatHistory>,
  ) {}

  async saveMessage(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    source: 'llm' | 'action' = 'llm',
  ): Promise<ChatHistory> {
    const history = this.chatHistoryRepository.create({
      userId,
      sessionId,
      userMessage,
      aiResponse,
      source,
    });
    return this.chatHistoryRepository.save(history);
  }

  async getSessionHistory(
    userId: string,
    sessionId: string,
    limit: number = 10,
  ): Promise<ChatHistory[]> {
    return this.chatHistoryRepository.find({
      where: { userId, sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async getUserSessions(userId: string, limit: number = 20): Promise<string[]> {
    const results = await this.chatHistoryRepository
      .createQueryBuilder('ch')
      .select('DISTINCT ch.sessionId', 'sessionId')
      .where('ch.userId = :userId', { userId })
      .orderBy('MAX(ch.createdAt)', 'DESC')
      .groupBy('ch.sessionId')
      .take(limit)
      .getRawMany();
    return results.map((r) => r.sessionId);
  }

  async clearSession(userId: string, sessionId: string): Promise<void> {
    await this.chatHistoryRepository.delete({ userId, sessionId });
  }

  async clearAllSessions(userId: string): Promise<void> {
    await this.chatHistoryRepository.delete({ userId });
  }
}
