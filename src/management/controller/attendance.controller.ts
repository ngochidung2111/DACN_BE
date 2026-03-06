import { Controller, Post, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { AttendanceService } from '../service/attendance.service';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';
import { AttendanceDto } from '../dto/attendance.dto';
import { plainToInstance } from 'class-transformer';
import { QueryAttendanceDto } from '../dto/query-attendance.dto';
import { MonthlyAttendanceSummaryQueryDto } from '../dto/monthly-attendance-summary-query.dto';

@ApiTags('Attendance')
@Controller('attendance')
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'Check in attendance' })
  @ApiResponse({ status: 201, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('check-in')
  async checkIn(@Request() req) {
    const attendance = await this.attendanceService.checkIn(req.user.userId);
    return {
      success: true,
      message: 'Checked in successfully',
      data: plainToInstance(AttendanceDto, attendance, { excludeExtraneousValues: true }),
    };
  }

  @ApiOperation({ summary: 'Check out attendance' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 400, description: 'Not checked in yet or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('check-out')
  async checkOut(@Request() req) {
    const attendance = await this.attendanceService.checkOut(req.user.userId);
    return {
      success: true,
      message: 'Checked out successfully',
      data: attendance,
    };
  }

  @ApiOperation({ summary: 'Get attendance records for the logged-in employee' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-03-01T00:00:00.000Z' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-03-31T23:59:59.000Z' })
  @ApiResponse({ status: 200, description: 'Attendance records retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my-attendance')
  async getAttendanceByEmployee(@Request() req, @Query() query: QueryAttendanceDto) {
    return ResponseBuilder.createResponse(
      {
        statusCode: 200,
        message: 'Attendance records retrieved successfully',
        data: await this.attendanceService.getAttendanceByEmployee(req.user.userId, query),
      }
    );
  }

  @ApiOperation({ summary: 'List attendance days and check if total working time is at least 8 hours' })
  @ApiResponse({ status: 200, description: 'Daily working hours retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my-attendance/daily-hours')
  async getDailyWorkingHours(@Request() req) {
    return ResponseBuilder.createResponse(
      {
        statusCode: 200,
        message: 'Daily working hours retrieved successfully',
        data: await this.attendanceService.getDailyWorkingHours(req.user.userId),
      }
    );
  }

  @ApiOperation({ summary: 'Get monthly attendance summary for logged-in employee' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 3 })
  @ApiResponse({ status: 200, description: 'Monthly attendance summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my-attendance/monthly-summary')
  async getMonthlyAttendanceSummary(
    @Request() req,
    @Query() query: MonthlyAttendanceSummaryQueryDto,
  ) {
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Monthly attendance summary retrieved successfully',
      data: await this.attendanceService.getMonthlyAttendanceSummary(
        req.user.userId,
        query.year,
        query.month,
      ),
    });
  }
}
