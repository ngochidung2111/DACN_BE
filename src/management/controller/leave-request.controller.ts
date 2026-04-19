import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { CreateLeaveRequestDto, ProcessLeaveRequestDto, QueryLeaveRequestDto, UpdateLeaveRequestDto } from '../dto';
import { ROLE } from '../entity/constants';
import { LeaveRequestService } from '../service/leave-request.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';

@ApiTags('Leave Requests')
@Controller('leave-requests')
@ApiBearerAuth()
export class LeaveRequestController {
  private readonly cacheVersionKey = 'leave-request:cache:version';
  private readonly cacheTtl = 60_000;

  constructor(
    private readonly leaveRequestService: LeaveRequestService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @ApiOperation({ summary: 'Submit leave request' })
  @ApiBody({ type: CreateLeaveRequestDto })
  @ApiResponse({ status: 201, description: 'Leave request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('submit')
  async submitLeaveRequest(
    @Request() req,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    const leaveRequest = await this.leaveRequestService.submitLeaveRequest(
      req.user.userId,
      createLeaveRequestDto,
    );
    await this.bumpCacheVersion();

    return {
      success: true,
      message: 'Leave request submitted successfully',
      data: leaveRequest,
    };
  }

  @ApiOperation({ summary: 'List leave requests of employees in manager department' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'employeeId', required: false, example: '4e4e9d0f-9f89-4ac9-aece-c72812ab5cbf' })
  @ApiQuery({ name: 'search', required: false, example: 'medical' })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-03-01T00:00:00.000Z' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-03-31T23:59:59.000Z' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.MANAGER)
  @Get('department')
  async getDepartmentLeaveRequests(@Request() req, @Query() query: QueryLeaveRequestDto) {
    const key = this.serializeQuery({ userId: req.user.userId, ...query });
    return this.getOrSetCache('department', key, async () => {
      const result = await this.leaveRequestService.getDepartmentLeaveRequestsForManager(
        req.user.userId,
        query,
      );

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Leave requests retrieved successfully',
        data: result,
      });
    });
  }

  @ApiOperation({ summary: 'List my leave requests' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'medical' })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-03-01T00:00:00.000Z' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-03-31T23:59:59.000Z' })
  @ApiResponse({ status: 200, description: 'My leave requests retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('my')
  async getMyLeaveRequests(@Request() req, @Query() query: QueryLeaveRequestDto) {
    const key = this.serializeQuery({ userId: req.user.userId, ...query });
    return this.getOrSetCache('my', key, async () => {
      const result = await this.leaveRequestService.getMyLeaveRequests(req.user.userId, query);
      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'My leave requests retrieved successfully',
        data: result,
      });
    });
  }

  @ApiOperation({ summary: 'Approve or reject leave request (manager only)' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiBody({ type: ProcessLeaveRequestDto })
  @ApiResponse({ status: 200, description: 'Leave request processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid decision or leave request already processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.MANAGER)
  @Patch(':id/process')
  async processLeaveRequest(
    @Request() req,
    @Param('id') leaveRequestId: string,
    @Body() body: ProcessLeaveRequestDto,
  ) {
    const leaveRequest = await this.leaveRequestService.processLeaveRequest(
      req.user.userId,
      leaveRequestId,
      body,
    );
    await this.bumpCacheVersion();

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave request processed successfully',
      data: leaveRequest,
    });
  }

  @ApiOperation({ summary: 'Get leave request detail by id' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request detail retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('my/:id')
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiBody({ type: UpdateLeaveRequestDto })
  @ApiResponse({ status: 200, description: 'Leave request updated successfully' })
  @ApiResponse({ status: 400, description: 'Only pending leave request can be updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async updateMyLeaveRequest(
    @Request() req,
    @Param('id') leaveRequestId: string,
    @Body() body: UpdateLeaveRequestDto,
  ) {
    const data = await this.leaveRequestService.updateMyLeaveRequest(req.user.userId, leaveRequestId, body);
    await this.bumpCacheVersion();

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave request updated successfully',
      data,
    });
  }

  @ApiOperation({ summary: 'Get leave summary for current employee' })
  @ApiResponse({ status: 200, description: 'Leave summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('summary/my')
  async getMyLeaveSummary(@Request() req) {
    const key = this.serializeQuery({ userId: req.user.userId });
    return this.getOrSetCache('summary-my', key, async () => {
      const data = await this.leaveRequestService.getMyLeaveSummary(req.user.userId);

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Leave summary retrieved successfully',
        data,
      });
    });
  }

  @ApiOperation({ summary: 'Get leave summary for manager department' })
  @ApiResponse({ status: 200, description: 'Department leave summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.MANAGER)
  @Get('summary/department')
  async getDepartmentLeaveSummary(@Request() req) {
    const key = this.serializeQuery({ userId: req.user.userId });
    return this.getOrSetCache('summary-department', key, async () => {
      const data = await this.leaveRequestService.getDepartmentLeaveSummary(req.user.userId);

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Department leave summary retrieved successfully',
        data,
      });
    });
  }

  @ApiOperation({ summary: 'Get leave request detail by id' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request detail retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async getLeaveRequestDetail(@Request() req, @Param('id') leaveRequestId: string) {
    const key = this.serializeQuery({ userId: req.user.userId, leaveRequestId });
    return this.getOrSetCache('detail', key, async () => {
      const detail = await this.leaveRequestService.getLeaveRequestDetail(req.user.userId, leaveRequestId);

      return ResponseBuilder.createResponse({
        statusCode: 200,
        message: 'Leave request detail retrieved successfully',
        data: detail,
      });
    });
  }

  @ApiOperation({ summary: 'Delete my leave request (not approved)' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request deleted successfully' })
  @ApiResponse({ status: 400, description: 'Approved leave request cannot be deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('my/:id')
  async deleteMyLeaveRequest(@Request() req, @Param('id') leaveRequestId: string) {
    await this.leaveRequestService.deleteMyLeaveRequest(req.user.userId, leaveRequestId);
    await this.bumpCacheVersion();

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave request deleted successfully',
      data: null,
    });
  }

  private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
    const version = await this.getCacheVersion();
    const key = `leave-request:${scope}:v${version}:${suffix}`;
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
