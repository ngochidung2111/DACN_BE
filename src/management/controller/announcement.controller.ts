import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { ROLE } from '../entity/constants';
import {
  AnnouncementListResponseDto,
  AnnouncementQueryDto,
  AnnouncementResponseDto,
  AnnouncementToggleLikeResponseDto,
  CreateAnnouncementCommentDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../dto/announcement';
import { AnnouncementService } from '../service/announcement.service';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { Roles } from '../../auth/roles.decorator';


@ApiTags('Announcements')
@Controller('announcements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnnouncementController {
  private readonly cacheVersionKey = 'announcement:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly announcementService: AnnouncementService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @ApiOperation({ summary: 'List announcements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'pinned', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get()
  async getAnnouncements(@Request() req, @Query() query: AnnouncementQueryDto) {
    const key = this.serializeQuery({ userId: req.user.userId, ...query });
    return this.getOrSetCache('list', key, async () => {
      const data = await this.announcementService.getAnnouncements(query, req.user.userId);
      return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcements retrieved successfully', data });
    });
  }

  @ApiOperation({ summary: 'Get pinned announcements' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get('pinned')
  async getPinnedAnnouncements(@Request() req) {
    const key = this.serializeQuery({ userId: req.user.userId });
    return this.getOrSetCache('pinned', key, async () => {
      const data = await this.announcementService.getPinnedAnnouncements(req.user.userId);
      return ResponseBuilder.createResponse({ statusCode: 200, message: 'Pinned announcements retrieved successfully', data });
    });
  }

  @ApiOperation({ summary: 'Get announcements I interacted with' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get('my-interactions')
  async getMyInteractions(@Request() req) {
    const key = this.serializeQuery({ userId: req.user.userId });
    return this.getOrSetCache('my-interactions', key, async () => {
      const data = await this.announcementService.getMyInteractions(req.user.userId);
      return ResponseBuilder.createResponse({ statusCode: 200, message: 'My announcements retrieved successfully', data });
    });
  }

  @ApiOperation({ summary: 'Get announcement detail' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @Get(':id')
  async getById(@Request() req, @Param('id') id: string) {
    const key = this.serializeQuery({ userId: req.user.userId, id });
    return this.getOrSetCache('detail', key, async () => {
      const data = await this.announcementService.getAnnouncementById(id, req.user.userId);
      return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement retrieved successfully', data });
    });
  }

  @ApiOperation({ summary: 'Get announcement interactions/comments' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Announcement comments retrieved successfully' })
  @Get(':id/interactions')
  async getInteractions(@Param('id') id: string) {
    return this.getOrSetCache('interactions', id, async () => {
      const data = await this.announcementService.getAnnouncementInteractions(id);
      return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement interactions retrieved successfully', data });
    });
  }

  @ApiOperation({ summary: 'Create announcement' })
  @ApiBody({ type: CreateAnnouncementDto })
  @ApiResponse({ status: 201, type: AnnouncementResponseDto })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post()
  async create(@Request() req, @Body() dto: CreateAnnouncementDto) {
    const data = await this.announcementService.createAnnouncement(req.user.userId, dto);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 201, message: 'Announcement created successfully', data });
  }

  @ApiOperation({ summary: 'Upload announcement image to S3 bucket' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Announcement image uploaded successfully' })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@Request() req, @Param('id') id: string, @UploadedFile() file: any) {
    const data = await this.announcementService.uploadAnnouncementImage(id, req.user.userId, file);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 201, message: 'Announcement image uploaded successfully', data });
  }

  @ApiOperation({ summary: 'Update announcement' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateAnnouncementDto })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    const data = await this.announcementService.updateAnnouncement(id, dto);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement updated successfully', data });
  }

  @ApiOperation({ summary: 'Delete announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.announcementService.deleteAnnouncement(id);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement deleted successfully', data: null });
  }

  @ApiOperation({ summary: 'Toggle pin announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id/pin')
  async togglePin(@Param('id') id: string) {
    const data = await this.announcementService.togglePin(id);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement pin updated successfully', data });
  }

  @ApiOperation({ summary: 'Toggle like announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementToggleLikeResponseDto })
  @Post(':id/like')
  async toggleLike(@Request() req, @Param('id') id: string) {
    const data = await this.announcementService.toggleLike(req.user.userId, id);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 200, message: data.liked ? 'Announcement liked' : 'Announcement unliked', data });
  }

  @ApiOperation({ summary: 'Add comment to announcement' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: CreateAnnouncementCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @Post(':id/comments')
  async addComment(@Request() req, @Param('id') id: string, @Body() dto: CreateAnnouncementCommentDto) {
    const data = await this.announcementService.addComment(req.user.userId, id, dto);
    await this.bumpCacheVersion();
    return ResponseBuilder.createResponse({ statusCode: 201, message: 'Comment added successfully', data });
  }

  private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `announcement:${scope}:v${version}:${suffix}`;
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

  private async bumpCacheVersion(): Promise<void> {
    const version = await this.getCacheVersion();
    await this.cacheManager.set(this.cacheVersionKey, version + 1);
  }

  private serializeQuery(query: Record<string, unknown>): string {
    const normalized = Object.keys(query || {})
      .sort()
      .reduce((result, key) => {
        const value = query[key];
        if (value !== undefined && value !== null && value !== '') {
          result[key] = value;
        }
        return result;
      }, {} as Record<string, unknown>);

    return JSON.stringify(normalized);
  }
}
