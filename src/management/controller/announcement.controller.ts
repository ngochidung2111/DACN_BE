import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  constructor(private readonly announcementService: AnnouncementService) {}

  @ApiOperation({ summary: 'List announcements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'pinned', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get()
  async getAnnouncements(@Request() req, @Query() query: AnnouncementQueryDto) {
    const data = await this.announcementService.getAnnouncements(query, req.user.userId);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcements retrieved successfully', data });
  }

  @ApiOperation({ summary: 'Get pinned announcements' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get('pinned')
  async getPinnedAnnouncements(@Request() req) {
    const data = await this.announcementService.getPinnedAnnouncements(req.user.userId);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Pinned announcements retrieved successfully', data });
  }

  @ApiOperation({ summary: 'Get announcements I interacted with' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  @Get('my-interactions')
  async getMyInteractions(@Request() req) {
    const data = await this.announcementService.getMyInteractions(req.user.userId);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'My announcements retrieved successfully', data });
  }

  @ApiOperation({ summary: 'Get announcement detail' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @Get(':id')
  async getById(@Request() req, @Param('id') id: string) {
    const data = await this.announcementService.getAnnouncementById(id, req.user.userId);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement retrieved successfully', data });
  }

  @ApiOperation({ summary: 'Get announcement interactions/comments' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Announcement comments retrieved successfully' })
  @Get(':id/interactions')
  async getInteractions(@Param('id') id: string) {
    const data = await this.announcementService.getAnnouncementInteractions(id);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement interactions retrieved successfully', data });
  }

  @ApiOperation({ summary: 'Create announcement' })
  @ApiBody({ type: CreateAnnouncementDto })
  @ApiResponse({ status: 201, type: AnnouncementResponseDto })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post()
  async create(@Request() req, @Body() dto: CreateAnnouncementDto) {
    const data = await this.announcementService.createAnnouncement(req.user.userId, dto);
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
  async uploadImage(@Request() req, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const data = await this.announcementService.uploadAnnouncementImage(id, req.user.userId, file);
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
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement updated successfully', data });
  }

  @ApiOperation({ summary: 'Delete announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.announcementService.deleteAnnouncement(id);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement deleted successfully', data: null });
  }

  @ApiOperation({ summary: 'Toggle pin announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id/pin')
  async togglePin(@Param('id') id: string) {
    const data = await this.announcementService.togglePin(id);
    return ResponseBuilder.createResponse({ statusCode: 200, message: 'Announcement pin updated successfully', data });
  }

  @ApiOperation({ summary: 'Toggle like announcement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AnnouncementToggleLikeResponseDto })
  @Post(':id/like')
  async toggleLike(@Request() req, @Param('id') id: string) {
    const data = await this.announcementService.toggleLike(req.user.userId, id);
    return ResponseBuilder.createResponse({ statusCode: 200, message: data.liked ? 'Announcement liked' : 'Announcement unliked', data });
  }

  @ApiOperation({ summary: 'Add comment to announcement' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: CreateAnnouncementCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @Post(':id/comments')
  async addComment(@Request() req, @Param('id') id: string, @Body() dto: CreateAnnouncementCommentDto) {
    const data = await this.announcementService.addComment(req.user.userId, id, dto);
    return ResponseBuilder.createResponse({ statusCode: 201, message: 'Comment added successfully', data });
  }
}
