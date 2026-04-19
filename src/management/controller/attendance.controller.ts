import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Post, UseGuards, Request, Get, Query, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Cache } from 'cache-manager';

import { AttendanceService } from '../service/attendance.service';

import { AttendanceDto, DepartmentAttendanceSummaryResponseDto } from '../dto/attendance';
import { plainToInstance } from 'class-transformer';
import { QueryAttendanceDto } from '../dto/attendance';
import { MonthlyAttendanceSummaryQueryDto } from '../dto/attendance';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { ROLE } from '../entity/constants';

@ApiTags('Attendance')
@Controller('attendance')
@ApiBearerAuth()
export class AttendanceController {
  private readonly cacheVersionKey = 'attendance:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly attendanceService: AttendanceService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @ApiOperation({ summary: 'Check in attendance' })
  @ApiResponse({ status: 201, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('check-in')
  async checkIn(@Request() req) {
    const attendance = await this.attendanceService.checkIn(req.user.userId);
    await this.bumpCacheVersion();
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
    await this.bumpCacheVersion();
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
    const key = this.serializeQuery({ userId: req.user.userId, ...query });
    return this.getOrSetCache('my-attendance', key, async () =>
      ResponseBuilder.createResponse(
        {
          statusCode: 200,
          message: 'Attendance records retrieved successfully',
          data: await this.attendanceService.getAttendanceByEmployee(req.user.userId, query),
        }
      ),
    );
  }

  @ApiOperation({ summary: 'Check whether current user checked in today' })
  @ApiResponse({ status: 200, description: 'Today check-in status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my-attendance/today-status')
  async getTodayCheckInStatus(@Request() req) {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dateKey = now.toISOString().slice(0, 10);
    const key = this.serializeQuery({ userId: req.user.userId, date: dateKey });
    return this.getOrSetCache('today-status', key, async () =>
      ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Today check-in status retrieved successfully',
        data: await this.attendanceService.getTodayCheckInStatus(req.user.userId),
      }),
    );
  }

  @ApiOperation({ summary: 'Manager checks whether employees in department checked in today' })
  @ApiResponse({ status: 200, description: 'Department today check-in status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.MANAGER, ROLE.ADMIN)
  @Get('department/today-checkin-status')
  async getDepartmentTodayCheckInStatus(@Request() req) {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dateKey = now.toISOString().slice(0, 10);
    const key = this.serializeQuery({ userId: req.user.userId, date: dateKey });
    return this.getOrSetCache('department-today-status', key, async () =>
      ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Department today check-in status retrieved successfully',
        data: await this.attendanceService.getDepartmentTodayCheckInStatus(req.user.userId),
      }),
    );
  }

  @ApiOperation({ summary: 'List attendance days and check if total working time is at least 8 hours' })
  @ApiResponse({ status: 200, description: 'Daily working hours retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my-attendance/daily-hours')
  async getDailyWorkingHours(@Request() req) {
    const key = this.serializeQuery({ userId: req.user.userId });
    return this.getOrSetCache('daily-hours', key, async () =>
      ResponseBuilder.createResponse(
        {
          statusCode: 200,
          message: 'Daily working hours retrieved successfully',
          data: await this.attendanceService.getDailyWorkingHours(req.user.userId),
        }
      ),
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
    const key = this.serializeQuery({ userId: req.user.userId, year: query.year, month: query.month });
    return this.getOrSetCache('monthly-summary', key, async () =>
      ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Monthly attendance summary retrieved successfully',
        data: await this.attendanceService.getMonthlyAttendanceSummary(
          req.user.userId,
          query.year,
          query.month,
        ),
      }),
    );
  }

  @ApiOperation({ summary: "Get attendance summary by department for manager" })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 4 })
  @ApiResponse({ status: 200, description: 'Department attendance summary retrieved successfully', type: DepartmentAttendanceSummaryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.MANAGER, ROLE.ADMIN)
  @Get('department/monthly-summary')
  async getDepartmentMonthlyAttendanceSummary(
    @Request() req,
    @Query() query: MonthlyAttendanceSummaryQueryDto,
  ) {
    const key = this.serializeQuery({ userId: req.user.userId, year: query.year, month: query.month });
    return this.getOrSetCache('department-monthly-summary', key, async () =>
      ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Department attendance summary retrieved successfully',
        data: await this.attendanceService.getDepartmentMonthlyAttendanceSummary(
          req.user.userId,
          query.year,
          query.month,
        ),
      }),
    );
  }

  private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `attendance:${scope}:v${version}:${suffix}`;
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
