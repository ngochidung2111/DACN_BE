import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';

import { PayrollMonthDto, PayrollResponseDto, PayrollWorkingDaysResponseDto } from '../dto/payroll';
import { PayrollService } from '../service/payroll.service';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Payroll')
@Controller('payroll')
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @ApiOperation({ summary: 'Generate monthly payroll for logged-in employee' })
  @ApiBody({ type: PayrollMonthDto })
  @ApiResponse({ status: 201, description: 'Payroll generated successfully', type: PayrollResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid period or missing salary setup' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my/generate-monthly')
  async generateMyMonthlyPayroll(@Request() req, @Body() body: PayrollMonthDto) {
    const payroll = await this.payrollService.generateMonthlyPayroll(req.user.userId, body.year, body.month);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Payroll generated successfully',
      data: plainToInstance(PayrollResponseDto, payroll, { excludeExtraneousValues: true }),
    });
  }

  @ApiOperation({ summary: 'Get payroll by month for logged-in employee' })
  @ApiBody({ type: PayrollMonthDto })
  @ApiResponse({ status: 200, description: 'Payroll retrieved successfully', type: PayrollResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my/by-month')
  async getMyPayrollByMonth(@Request() req, @Body() body: PayrollMonthDto) {
    const payroll = await this.payrollService.getMyPayrollByMonth(req.user.userId, body.year, body.month);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Payroll retrieved successfully',
      data: plainToInstance(PayrollResponseDto, payroll, { excludeExtraneousValues: true }),
    });
  }

  @ApiOperation({ summary: 'Get number of working days in a month' })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2026 })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 2 })
  @ApiResponse({ status: 200, description: 'Working days retrieved successfully', type: PayrollWorkingDaysResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('working-days')
  async getWorkingDaysInMonth(
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    const workingDays = await this.payrollService.getWorkingDaysInMonth(Number(year), Number(month));
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Working days retrieved successfully',
      data: {
        year: Number(year),
        month: Number(month),
        workingDays,
      },
    });
  }
}