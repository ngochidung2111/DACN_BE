import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BookingService } from '../service/booking.service';
import { LeaveRequestService } from '../service/leave-request.service';
import { EmployeeScheduleResponseDto } from '../dto';
import { RolesGuard } from '../../auth/roles.guard';

@ApiTags('Management')
@Controller('management')
@ApiBearerAuth()
export class ManagementController {
	constructor(
		private readonly bookingService: BookingService,
		private readonly leaveRequestService: LeaveRequestService,
	) {}

	@ApiOperation({ summary: 'Lấy lịch của nhân viên hiện tại' })
	@ApiQuery({ name: 'fromDate', required: false, description: 'From date (ISO)' })
	@ApiQuery({ name: 'toDate', required: false, description: 'To date (ISO)' })
	@ApiResponse({ status: 200, description: 'Employee schedule retrieved successfully', type: EmployeeScheduleResponseDto })
	@UseGuards(AuthGuard('jwt'), RolesGuard)
	@Get('schedule/me')
	async getMySchedule(
		@Request() req,
		@Query('fromDate') fromDate?: string,
		@Query('toDate') toDate?: string,
	) {
		const employeeId = req.user.userId;
		const startDate = fromDate ? new Date(fromDate) : undefined;
		const endDate = toDate ? new Date(toDate) : undefined;

		const [bookings, leaveRequests] = await Promise.all([
			this.bookingService.findInvolvedBookingsSchedule(employeeId, startDate, endDate),
			this.leaveRequestService.findMyLeaveRequestsSchedule(employeeId, startDate, endDate),
		]);

		const items = [...bookings, ...leaveRequests].sort(
			(left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime(),
		);

		return {
			success: true,
			data: {
				items,
				total: items.length,
			},
		};
	}
}
