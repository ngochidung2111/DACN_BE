import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { BookingService } from '../service/booking.service';
import { LeaveRequestService } from '../service/leave-request.service';
import { EmployeeScheduleResponseDto } from '../dto';
import { RolesGuard } from '../../auth/roles.guard';

@ApiTags('Management')
@Controller('management')
@ApiBearerAuth()
export class ManagementController {
	private readonly cacheTtl = 60_000;

	constructor(
		private readonly bookingService: BookingService,
		private readonly leaveRequestService: LeaveRequestService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
		const key = this.serializeQuery({ employeeId, fromDate, toDate });

		return this.getOrSetCache('schedule-me', key, async () => {
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
		});
	}

	private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
		const { bookingVersion, leaveVersion } = await this.getSourceVersions();
		const key = `management:${scope}:bv${bookingVersion}:lv${leaveVersion}:${suffix}`;
		const cached = await this.cacheManager.get<T>(key);

		if (cached !== undefined && cached !== null) {
			return cached;
		}

		const fresh = await factory();
		await this.cacheManager.set(key, fresh, this.cacheTtl);
		return fresh;
	}

	private async getSourceVersions(): Promise<{ bookingVersion: number; leaveVersion: number }> {
		const bookingValue = await this.cacheManager.get<number>('booking:cache:version');
		const leaveValue = await this.cacheManager.get<number>('leave-request:cache:version');

		const bookingVersion =
			typeof bookingValue === 'number' && Number.isFinite(bookingValue) && bookingValue > 0
				? bookingValue
				: 1;

		const leaveVersion =
			typeof leaveValue === 'number' && Number.isFinite(leaveValue) && leaveValue > 0
				? leaveValue
				: 1;

		return { bookingVersion, leaveVersion };
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
