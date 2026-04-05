import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
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
      load: [defaultConfig, localConfig, authConfig, authLocalConfig, s3Config],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    ManagementModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
