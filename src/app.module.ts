import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementModule } from './management/management.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import defaultConfig from './config/default.config';
import localConfig from './config/local.config';
import authConfig from './config/auth.config';
import authLocalConfig from './config/auth.local.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [defaultConfig, localConfig, authConfig, authLocalConfig],
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
