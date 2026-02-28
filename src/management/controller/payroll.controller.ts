import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';
import { PayrollMonthDto } from '../dto/payroll-month.dto';
import { PayrollService } from '../service/payroll.service';

@ApiTags('Payroll')
@Controller('payroll')
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @ApiOperation({ summary: 'Generate monthly payroll for logged-in employee' })
  @ApiResponse({ status: 201, description: 'Payroll generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid period or missing salary setup' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my/generate-monthly')
  async generateMyMonthlyPayroll(@Request() req, @Body() body: PayrollMonthDto) {
    const payroll = await this.payrollService.generateMonthlyPayroll(req.user.userId, body.year, body.month);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Payroll generated successfully',
      data: payroll,
    });
  }

  @ApiOperation({ summary: 'Get payroll by month for logged-in employee' })
  @ApiResponse({ status: 200, description: 'Payroll retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('my/by-month')
  async getMyPayrollByMonth(@Request() req, @Body() body: PayrollMonthDto) {
    const payroll = await this.payrollService.getMyPayrollByMonth(req.user.userId, body.year, body.month);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Payroll retrieved successfully',
      data: payroll,
    });
  }
}