import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from '../service/booking.service';
import { AddBookingAttendeesDto, CreateBookingDto, UpdateBookingDto, BookingResponseDto } from '../dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { Cache } from 'cache-manager';


@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingController {
  private readonly cacheVersionKey = 'booking:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly bookingService: BookingService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Tạo booking mới
  @ApiOperation({ summary: 'Tạo đặt phòng mới' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req,
  ) {
    const booking = await this.bookingService.createBooking(req.user.userId, createBookingDto);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Booking created successfully',
      data: booking,
    };
  }

  // Lấy tất cả bookings
  @ApiOperation({ summary: 'Lấy danh sách tất cả bookings' })
  @ApiQuery({ name: 'roomId', required: false, description: 'Lọc theo ID phòng' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Lọc theo ID nhân viên' })
  @ApiQuery({ name: 'attendeeId', required: false, description: 'Lọc theo attendee ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  async getAllBookings(
    @Query('roomId') roomId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('attendeeId') attendeeId?: string,
    @Query('status') status?: string,
  ) {
    const key = this.serializeQuery({ roomId, employeeId, attendeeId, status });
    return this.getOrSetCache('all', key, async () => {
      const bookings = await this.bookingService.getAllBookings(
        roomId,
        employeeId,
        status as any,
        attendeeId,
      );
      return {
        success: true,
        data: bookings,
        total: bookings.length,
      };
    });
  }

  // Lấy lịch sử booking của employee (đặt trước route :id để tránh xung đột)
  @ApiOperation({ summary: 'Lấy lịch sử bookings của nhân viên' })
  @ApiResponse({
    status: 200,
    description: 'List of employee bookings',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('employee')
  async getEmployeeBookingHistory(@Request() req) {
    const employeeId = req.user.userId;
    return this.getOrSetCache('employee-history', String(employeeId), async () => {
      const bookings = await this.bookingService.getEmployeeBookingHistory(employeeId);
      return {
        success: true,
        data: bookings,
        total: bookings.length,
      };
    });
  }
  @ApiOperation({ summary: 'Lấy bookings theo nhân viên' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for employee',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('by-employee')
  async findByEmployee(@Request() req) {
    const employeeId = req.user.userId;
    return this.getOrSetCache('by-employee', String(employeeId), async () => {
      const bookings = await this.bookingService.findByEmployee(employeeId);
      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Bookings retrieved successfully',
        data: bookings,
      });
    });
  }

  @ApiOperation({ summary: 'Lấy bookings mà nhân viên tạo hoặc tham gia' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings where employee is creator or attendee',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('involved/me')
  async getInvolvedBookings(@Request() req) {
    const employeeId = req.user.userId;
    return this.getOrSetCache('involved-me', String(employeeId), async () => {
      const bookings = await this.bookingService.findByCreatorOrAttendee(employeeId);
      return {
        success: true,
        data: bookings,
        total: bookings.length,
      };
    });
  }

  // Lấy booking theo ID
  @ApiOperation({ summary: 'Lấy thông tin booking theo ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking details',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async getBookingById(@Param('id') bookingId: string) {
    return this.getOrSetCache('by-id', bookingId, async () => {
      const booking = await this.bookingService.getBookingById(bookingId);
      return {
        success: true,
        data: booking,
      };
    });
  }

  // Cập nhật booking
  @ApiOperation({ summary: 'Cập nhật thông tin booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiResponse({
    status: 200,
    description: 'Booking updated successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put(':id')
  async updateBooking(
    @Param('id') bookingId: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingService.updateBooking(bookingId, updateBookingDto);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Booking updated successfully',
      data: booking,
    };
  }

  @ApiOperation({ summary: 'Thêm attendee vào booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ type: AddBookingAttendeesDto })
  @ApiResponse({
    status: 200,
    description: 'Booking attendees added successfully',
    type: BookingResponseDto,
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/attendees')
  async addAttendees(
    @Param('id') bookingId: string,
    @Body() body: AddBookingAttendeesDto,
  ) {
    const booking = await this.bookingService.addAttendees(bookingId, body.attendee_ids);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Attendees added successfully',
      data: booking,
    };
  }

  // Xóa booking
  @ApiOperation({ summary: 'Xóa booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking deleted successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  async deleteBooking(@Param('id') bookingId: string) {
    await this.bookingService.deleteBooking(bookingId);
    await this.bumpCacheVersion();
    return {
      success: true,
      message: 'Booking deleted successfully',
    };
  }

  // Lấy bookings theo phòng và khoảng thời gian
  @ApiOperation({ summary: 'Lấy bookings của phòng trong khoảng thời gian' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiQuery({ name: 'startDate', description: 'Ngày bắt đầu (ISO format)' })
  @ApiQuery({ name: 'endDate', description: 'Ngày kết thúc (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for room',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('room/:roomId')
  async getBookingsByRoomAndDateRange(
    @Param('roomId') roomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const key = this.serializeQuery({ roomId, startDate, endDate });
    return this.getOrSetCache('room-range', key, async () => {
      const bookings = await this.bookingService.getBookingsByRoomAndDateRange(
        roomId,
        new Date(startDate),
        new Date(endDate),
      );
      return {
        success: true,
        data: bookings,
        total: bookings.length,
      };
    });
  }


  // Kiểm tra sẵn có của phòng
  @ApiOperation({ summary: 'Kiểm tra phòng có sẵn không' })
  @ApiBody({
    description: 'Check room availability request',
    schema: {
      type: 'object',
      properties: {
        room_id: { type: 'string', description: 'Room ID' },
        start_time: { type: 'string', description: 'Start time (ISO format)' },
        end_time: { type: 'string', description: 'End time (ISO format)' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room availability result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        available: { type: 'boolean' },
      },
    },
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('check-availability')
  async checkRoomAvailability(
    @Body() body: { room_id: string; start_time: string; end_time: string },
  ) {
    const isAvailable = await this.bookingService.checkRoomAvailability(
      body.room_id,
      new Date(body.start_time),
      new Date(body.end_time),
    );
    return {
      success: true,
      available: isAvailable,
    };
  }
  @ApiOperation({ summary: 'Lấy bookings theo phòng' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for room',
    type: [BookingResponseDto],
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('by-room/:roomId')
  async findByRoom(@Param('roomId') roomId: string) {
    return this.getOrSetCache('by-room', roomId, async () =>
      ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Bookings retrieved successfully',
        data: await this.bookingService.findByRoom(roomId),
      }),
    );
  }

  private async getOrSetCache<T>(
    scope: string,
    suffix: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `booking:${scope}:v${version}:${suffix}`;
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
