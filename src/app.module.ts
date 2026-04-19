import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-redis-yet';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import aiConfig from './config/ai.config';
import authConfig from './config/auth.config';
import authLocalConfig from './config/auth.local.config';
import defaultConfig from './config/default.config';
import localConfig from './config/local.config';
import s3Config from './config/s3.config';
import { ManagementModule } from './management/management.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [defaultConfig, localConfig, authConfig, authLocalConfig, s3Config, aiConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const ttl = Number(configService.get<string>('CACHE_TTL_MS') || 60_000);
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = Number(configService.get<string>('REDIS_PORT') || 6379);
        const redisDb = Number(configService.get<string>('REDIS_DB') || 0);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        if (!redisHost) {
          return { ttl };
        }

        return {
          ttl,
          store: await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
            },
            password: redisPassword || undefined,
            database: redisDb,
          }),
        };
      },
    }),
    ManagementModule,
    AuthModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
