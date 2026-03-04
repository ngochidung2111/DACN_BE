import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';
import { CreateLeaveRequestDto, ProcessLeaveRequestDto, QueryLeaveRequestDto, UpdateLeaveRequestDto } from '../dto';
import { ROLE } from '../entity/constants';
import { LeaveRequestService } from '../service/leave-request.service';

@ApiTags('Leave Requests')
@Controller('leave-requests')
@ApiBearerAuth()
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

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
    const result = await this.leaveRequestService.getDepartmentLeaveRequestsForManager(
      req.user.userId,
      query,
    );

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave requests retrieved successfully',
      data: result,
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
    const result = await this.leaveRequestService.getMyLeaveRequests(req.user.userId, query);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'My leave requests retrieved successfully',
      data: result,
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
    const data = await this.leaveRequestService.getMyLeaveSummary(req.user.userId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave summary retrieved successfully',
      data,
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
    const data = await this.leaveRequestService.getDepartmentLeaveSummary(req.user.userId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Department leave summary retrieved successfully',
      data,
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
    const detail = await this.leaveRequestService.getLeaveRequestDetail(req.user.userId, leaveRequestId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave request detail retrieved successfully',
      data: detail,
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

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Leave request deleted successfully',
      data: null,
    });
  }
}
