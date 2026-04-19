import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Cache } from 'cache-manager';

import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportDto,
  ReportListResponseDto,
  ReportResponseDto,
} from '../dto';
import { Report } from '../entity/report.entity';
import { ReportService } from '../service/report.service';
import { RolesGuard } from '../../auth/roles.guard';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';

@Controller('management/reports')
@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportController {
  private readonly cacheVersionKey = 'report:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly reportService: ReportService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

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
    await this.bumpCacheVersion();
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
    return this.getOrSetCache('list', this.serializeQuery(query as unknown as Record<string, unknown>), async () => {
      const result = await this.reportService.getReports(query);
      const data = plainToInstance(ReportListResponseDto, result, {
        excludeExtraneousValues: true,
      });

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Reports retrieved successfully',
        data,
      });
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get reports created by current user' })
  @ApiResponse({
    status: 200,
    description: 'My reports retrieved successfully',
    type: ReportListResponseDto,
  })
  @ApiQuery({ type: QueryReportDto })
  async getMyReports(
    @Query() query: Omit<QueryReportDto, 'employee_id'>,
    @Req() req: any,
  ) {
    const employeeId = req.user.userId;
    const key = this.serializeQuery({ employeeId, ...(query as Record<string, unknown>) });
    return this.getOrSetCache('my', key, async () => {
      const result = await this.reportService.getMyReports(employeeId, query);
      const data = plainToInstance(ReportListResponseDto, result, {
        excludeExtraneousValues: true,
      });

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'My reports retrieved successfully',
        data,
      });
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
    return this.getOrSetCache('by-id', id, async () => {
      const report = await this.reportService.getReportById(id);
      const data = plainToInstance(ReportResponseDto, report, {
        excludeExtraneousValues: true,
      });

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Report retrieved successfully',
        data,
      });
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
    await this.bumpCacheVersion();
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
    await this.bumpCacheVersion();

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
    await this.bumpCacheVersion();
    const data = plainToInstance(ReportResponseDto, report, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Report submitted successfully',
      data,
    });
  }

  @Get("/manager")
  @ApiOperation({ summary: 'Get team reports (manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Team reports retrieved successfully',
    type: ReportListResponseDto,
  })
  async getTeamReports(@Query() query: QueryReportDto) {
    return this.getOrSetCache('manager', this.serializeQuery(query as unknown as Record<string, unknown>), async () => {
      const result = await this.reportService.getTeamReports(query);
      const data = plainToInstance(ReportListResponseDto, result, {
        excludeExtraneousValues: true,
      });

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Team reports retrieved successfully',
        data,
      });
    });
  }

  private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `report:${scope}:v${version}:${suffix}`;
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
