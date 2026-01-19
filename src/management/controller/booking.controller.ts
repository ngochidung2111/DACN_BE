import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService } from '../service/booking.service';
import { CreateBookingDto, UpdateBookingDto, BookingResponseDto } from '../dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

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
    @Query('status') status?: string,
  ) {
    const bookings = await this.bookingService.getAllBookings(roomId, employeeId, status as any);
    return {
      success: true,
      data: bookings,
      total: bookings.length,
    };
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
    const bookings = await this.bookingService.getEmployeeBookingHistory(employeeId);
    return {
      success: true,
      data: bookings,
      total: bookings.length,
    };
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
    const bookings = await this.bookingService.findByEmployee(employeeId);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Bookings retrieved successfully',
      data: bookings,
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
    const booking = await this.bookingService.getBookingById(bookingId);
    return {
      success: true,
      data: booking,
    };
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
    return {
      success: true,
      message: 'Booking updated successfully',
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
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Bookings retrieved successfully',
      data: await this.bookingService.findByRoom(roomId),
    });
  }

  
}
