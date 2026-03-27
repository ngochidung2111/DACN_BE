import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { RolesGuard } from 'src/auth/roles.guard';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';
import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportDto,
  ReportListResponseDto,
  ReportResponseDto,
} from '../dto';
import { Report } from '../entity/report.entity';
import { ReportService } from '../service/report.service';

@Controller('management/reports')
@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new weekly report' })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
    type: ReportResponseDto,
  })
  async create(@Body() dto: CreateReportDto, @Req() req: any) {
    const employeeId = req.user.userId;
    const report = await this.reportService.createReport(dto, employeeId);
    const data = plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Report created successfully',
      data,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get list of reports with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: ReportListResponseDto,
  })
  async list(@Query() query: QueryReportDto) {
    const result = await this.reportService.getReports(query);
    const data = plainToInstance(ReportListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Reports retrieved successfully',
      data,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get reports created by current user' })
  @ApiResponse({
    status: 200,
    description: 'My reports retrieved successfully',
    type: ReportListResponseDto,
  })
  async getMyReports(
    @Query() query: Omit<QueryReportDto, 'employee_id'>,
    @Req() req: any,
  ) {
    const employeeId = req.user.userId;
    const result = await this.reportService.getMyReports(employeeId, query);
    const data = plainToInstance(ReportListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'My reports retrieved successfully',
      data,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
    type: ReportResponseDto,
  })
  async getById(@Param('id') id: string) {
    const report = await this.reportService.getReportById(id);
    const data = plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Report retrieved successfully',
      data,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report' })
  @ApiBody({ type: UpdateReportDto })
  @ApiResponse({
    status: 200,
    description: 'Report updated successfully',
    type: ReportResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    const report = await this.reportService.updateReport(id, dto);
    const data = plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Report updated successfully',
      data,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({
    status: 200,
    description: 'Report deleted successfully',
  })
  async delete(@Param('id') id: string) {
    await this.reportService.deleteReport(id);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Report deleted successfully',
      data: null,
    });
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit report' })
  @ApiResponse({
    status: 200,
    description: 'Report submitted successfully',
    type: ReportResponseDto,
  })
  async submit(@Param('id') id: string) {
    const report = await this.reportService.submitReport(id);
    const data = plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Report submitted successfully',
      data,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get team reports (manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Team reports retrieved successfully',
    type: ReportListResponseDto,
  })
  async getTeamReports(@Query() query: QueryReportDto) {
    const result = await this.reportService.getTeamReports(query);
    const data = plainToInstance(ReportListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Team reports retrieved successfully',
      data,
    });
  }
}
