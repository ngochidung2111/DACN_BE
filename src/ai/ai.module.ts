import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ManagementModule } from '../management/management.module';
import { AiController } from './controller/ai.controller';
import { ChatHistory } from './entity/chat-history.entity';
import { AiService } from './service/ai.service';
import { ChatHistoryService } from './service/chat-history.service';


@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ManagementModule,
    TypeOrmModule.forFeature([ChatHistory]),
  ],
  controllers: [AiController],
  providers: [AiService, ChatHistoryService],
  exports: [ChatHistoryService],
})
export class AiModule {}
