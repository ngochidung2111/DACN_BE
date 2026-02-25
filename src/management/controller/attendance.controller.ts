import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { AttendanceService } from '../service/attendance.service';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';
import { AttendanceDto } from '../dto/attendance.dto';
import { plainToInstance } from 'class-transformer';

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
  @ApiResponse({ status: 200, description: 'Attendance records retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my-attendance')
  async getAttendanceByEmployee(@Request() req) {
    return ResponseBuilder.createResponse(
      {
        statusCode: 200,
        message: 'Attendance records retrieved successfully',
        data: await this.attendanceService.getAttendanceByEmployee(req.user.userId),
      }
    );
  }

  @ApiOperation({ summary: 'List attendance days and check if total working time is at least 8 hours' })
  @ApiResponse({ status: 200, description: 'Daily working hours retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my-attendance/daily-hours')
  async getDailyWorkingHours(@Request() req) {
    return ResponseBuilder.createResponse(
      {
        statusCode: 200,
        message: 'Daily working hours retrieved successfully',
        data: await this.attendanceService.getDailyWorkingHours(req.user.userId),
      }
    );
  }
}
