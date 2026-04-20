import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { QueryNotificationDto } from '../dto/notification';
import { NotificationListResponseDto } from '../dto/notification';
import { NotificationService } from '../service/notification.service';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationController {
  private readonly cacheVersionKey = 'notification:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly notificationService: NotificationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully', type: NotificationListResponseDto })
  @Get('my')
  async getMyNotifications(@Request() req, @Query() query: QueryNotificationDto) {
    const key = this.serializeQuery({ userId: req.user.userId, ...query });
    return this.getOrSetCache('my', key, async () => {
      const data = await this.notificationService.getMyNotifications(req.user.userId, query);

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Notifications retrieved successfully',
        data,
      });
    });
  }

  private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `notification:${scope}:v${version}:${suffix}`;
    const cached = await this.cacheManager.get<T>(key);

    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const fresh = await factory();
    await this.cacheManager.set(key, fresh, this.cacheTtl);
    return fresh;
  }

  private async getCacheVersion(): Promise<number> {
    const value = await this.cacheManager.get<number>(this.cacheVersionKey);
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    await this.cacheManager.set(this.cacheVersionKey, 1);
    return 1;
  }

  private serializeQuery(query: Record<string, unknown>): string {
    const normalized = Object.keys(query || {})
      .sort()
      .reduce((result, currentKey) => {
        const value = query[currentKey];
        if (value !== undefined && value !== null && value !== '') {
          result[currentKey] = value;
        }
        return result;
      }, {} as Record<string, unknown>);

    return JSON.stringify(normalized);
  }
}
