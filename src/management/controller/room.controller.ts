import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoomService } from '../service/room.service';
import { CreateRoomDto, UpdateRoomDto, RoomResponseDto, RoomImageUploadDto } from '../dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ROLE } from '../entity/constants';

@ApiTags('Rooms')
@Controller('rooms')
@ApiBearerAuth()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

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
  @Roles(ROLE.ADMIN)
  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomService.createRoom(createRoomDto);
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
  @Roles(ROLE.ADMIN)
  @Get()
  async getAllRooms() {
    const rooms = await this.roomService.getAllRooms();
    return {
      success: true,
      data: rooms,
      total: rooms.length,
    };
  }

  // Lấy URL tạm thời để xem ảnh phòng
  @ApiOperation({ summary: 'Lấy URL tạm thời để xem ảnh phòng' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Temporary read URL' })
  @ApiResponse({ status: 404, description: 'Room or image not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
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
  @Roles(ROLE.ADMIN)
  @Get(':id')
  async getRoomById(@Param('id') roomId: string) {
    const room = await this.roomService.getRoomById(roomId);
    return {
      success: true,
      data: room,
    };
  }

  // Tạo URL upload ảnh phòng lên S3
  @ApiOperation({ summary: 'Tạo URL upload ảnh phòng lên S3' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({ type: RoomImageUploadDto })
  @ApiResponse({ status: 200, description: 'Presigned upload URL created' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Post(':id/image/upload-url')
  async createRoomImageUploadUrl(
    @Param('id') roomId: string,
    @Body() payload: RoomImageUploadDto,
  ) {
    const data = await this.roomService.createRoomImageUploadUrl(
      roomId,
      payload.fileName,
      payload.fileType,
    );

    return {
      success: true,
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
    const rooms = await this.roomService.findRoomsByCapacity(parseInt(minCapacity, 10));
    return {
      success: true,
      data: rooms,
      total: rooms.length,
    };
  }
}
