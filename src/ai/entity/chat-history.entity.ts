import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('chat_history')
@Index(['userId', 'sessionId'])
@Index(['sessionId'])
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  sessionId: string;

  @Column('text')
  userMessage: string;

  @Column('text')
  aiResponse: string;

  @Column({ default: 'llm' })
  source: 'llm' | 'action';

  @CreateDateColumn()
  createdAt: Date;
}
