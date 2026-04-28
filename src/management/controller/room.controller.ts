import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UploadedFile, UseGuards, UseInterceptors, Inject, ParseFilePipeBuilder } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoomService } from '../service/room.service';
import { CreateRoomDto, UpdateRoomDto, RoomResponseDto } from '../dto';

import { AuthGuard } from '@nestjs/passport';
import { ROLE } from '../entity/constants';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Cache } from 'cache-manager';

@ApiTags('Rooms')
@Controller('rooms')
@ApiBearerAuth()
export class RoomController {
  private readonly cacheVersionKey = 'room:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly roomService: RoomService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Tạo phòng mới
  @ApiOperation({ summary: 'Tạo phòng mới' })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomService.createRoom(createRoomDto);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Room created successfully',
      data: room,
    };
  }

  // Lấy tất cả phòng
  @ApiOperation({ summary: 'Lấy danh sách tất cả phòng' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms',
    type: [RoomResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  async getAllRooms() {
    return this.getOrSetCache('all', 'all', async () => {
      const rooms = await this.roomService.getAllRooms();
      return {
        success: true,
        data: rooms,
        total: rooms.length,
      };
    });
  }

  // Lấy URL tạm thời để xem ảnh phòng
  @ApiOperation({ summary: 'Lấy URL tạm thời để xem ảnh phòng' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Temporary read URL' })
  @ApiResponse({ status: 404, description: 'Room or image not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/image')
  async getRoomImage(@Param('id') roomId: string) {
    const result = await this.roomService.getRoomImageReadUrl(roomId);
    return {
      success: true,
      data: result,
    };
  }

  // Lấy phòng theo ID
  @ApiOperation({ summary: 'Lấy thông tin phòng theo ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room details',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async getRoomById(@Param('id') roomId: string) {
    return this.getOrSetCache('by-id', roomId, async () => {
      const room = await this.roomService.getRoomById(roomId);
      return {
        success: true,
        data: room,
      };
    });
  }

  @ApiOperation({ summary: 'Upload ảnh phòng qua backend (multipart/form-data)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
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
  @ApiResponse({ status: 201, description: 'Room image uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/image/upload')
  async uploadRoomImage(
    @Param('id') roomId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp|gif)$/i })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: 400,
        }),
    )
    file: any,
  ) {
    const data = await this.roomService.uploadRoomImage(roomId, file);
    await this.bumpCacheVersion();

    return {
      success: true,
      message: 'Room image uploaded successfully',
      data,
    };
  }

  // Cập nhật phòng
  @ApiOperation({ summary: 'Cập nhật thông tin phòng' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({ type: UpdateRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Put(':id')
  async updateRoom(
    @Param('id') roomId: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    const room = await this.roomService.updateRoom(roomId, updateRoomDto);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Room updated successfully',
      data: room,
    };
  }

  // Xóa phòng
  @ApiOperation({ summary: 'Xóa phòng' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  async deleteRoom(@Param('id') roomId: string) {
    await this.roomService.deleteRoom(roomId);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Room deleted successfully',
    };
  }

  // Tìm phòng theo capacity
  @ApiOperation({ summary: 'Tìm phòng theo capacity tối thiểu' })
  @ApiQuery({ name: 'minCapacity', description: 'Minimum capacity required', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms with specified capacity',
    type: [RoomResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin only' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Get('search/capacity')
  async findRoomsByCapacity(@Query('minCapacity') minCapacity: string) {
    const parsedCapacity = parseInt(minCapacity, 10);
    return this.getOrSetCache('search-capacity', String(parsedCapacity), async () => {
      const rooms = await this.roomService.findRoomsByCapacity(parsedCapacity);
      return {
        success: true,
        data: rooms,
        total: rooms.length,
      };
    });
  }

  private async getOrSetCache<T>(
    scope: string,
    suffix: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `room:${scope}:v${version}:${suffix}`;
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
}
