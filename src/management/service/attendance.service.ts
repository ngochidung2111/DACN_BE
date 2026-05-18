import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { Attendance } from "../entity/attendance.entity";
import { LeaveRequest } from "../entity/leave-request.entity";
import { QueryAttendanceDto } from "../dto/attendance";
import { DepartmentAttendanceEmployeeDto, DepartmentAttendanceSummaryResponseDto } from "../dto/attendance";
import { LEAVE_REQUEST_STATUS, ROLE } from "../entity/constants";
import { EmployeeService } from "../../auth/service/employee.service";

@Injectable()
export class AttendanceService {
    

    constructor(
        @InjectRepository(Attendance)
        private readonly attendanceRepository: Repository<Attendance>,
        @InjectRepository(LeaveRequest)
        private readonly leaveRequestRepository: Repository<LeaveRequest>,
        private readonly employeeService: EmployeeService,
    ) {}

    private buildUtc7Threshold(date: Date, hour: number) {
        return new Date(Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            hour,
            0,
            0,
            0,
        ));
    }

    private nowUtc7() {
        return new Date(Date.now() + 7 * 60 * 60 * 1000);
    }

    private formatUtcDate(date: Date) {
        // Normalize to UTC+7 (Vietnam) so grouping is by local day
        const v = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const year = v.getUTCFullYear();
        const month = String(v.getUTCMonth() + 1).padStart(2, '0');
        const day = String(v.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async checkIn(employeeId: string) {
        const employee = await this.employeeService.findById(employeeId);

        const existingOpenAttendance = await this.attendanceRepository.findOne({
            where: {
                employee: { id: employee.id },
                TimeOut: IsNull(),
            },
        });

        if (existingOpenAttendance) {
            throw new BadRequestException('Employee already checked in and not checked out');
        }

        const attendance = this.attendanceRepository.create({
            employee,
            TimeIn: this.nowUtc7(),
        });
        
        return this.attendanceRepository.save(attendance);
    }

    async checkOut(employeeId: string) {
        const employee = await this.employeeService.findById(employeeId);

        const openAttendance = await this.attendanceRepository.findOne({
            where: {
                employee: { id: employee.id },
                TimeOut: IsNull(),
            },
            order: { TimeIn: 'DESC' },
        });

        if (!openAttendance) {
            throw new BadRequestException('Employee has not checked in yet');
        }

        openAttendance.TimeOut = this.nowUtc7();
        
        return this.attendanceRepository.save(openAttendance);
    }

    async getAttendanceByEmployee(employeeId: string, query: QueryAttendanceDto) {
        const employee = await this.employeeService.findById(employeeId);
        const attendanceQuery = this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoin('attendance.employee', 'employee')
            .where('employee.id = :employeeId', { employeeId: employee.id })
            .orderBy('attendance.TimeIn', 'DESC');

        if (query.fromDate) {
            attendanceQuery.andWhere('attendance.TimeIn >= :fromDate', {
                fromDate: new Date(query.fromDate),
            });
        }

        if (query.toDate) {
            attendanceQuery.andWhere('attendance.TimeIn <= :toDate', {
                toDate: new Date(query.toDate),
            });
        }

        if (query.page && query.pageSize) {
            attendanceQuery
                .skip((query.page - 1) * query.pageSize)
                .take(query.pageSize);
        }

        const attendances = await attendanceQuery.getMany();
        const attendanceDTOs = attendances.map(attendance => {
            const timeInThreshold = this.buildUtc7Threshold(attendance.TimeIn, 8);
            const timeOutThreshold = attendance.TimeOut
                ? this.buildUtc7Threshold(attendance.TimeOut, 17)
                : null;
            
            const timeInStatus = attendance.TimeIn > timeInThreshold ? 'LATE' : 'ON_TIME';
            const timeOutStatus = attendance.TimeOut && timeOutThreshold && attendance.TimeOut < timeOutThreshold
                ? 'EARLY'
                : 'ON_TIME';

            return {
                id: attendance.id,
                timeIn: attendance.TimeIn,
                timeOut: attendance.TimeOut,
                timeInStatus: timeInStatus,
                timeOutStatus: timeOutStatus,
            };
        });
        return attendanceDTOs;
    }

    async getDailyWorkingHours(employeeId: string) {
        const employee = await this.employeeService.findById(employeeId);
        const attendances = await this.attendanceRepository.find({
            where: { employee: { id: employee.id } },
            order: { TimeIn: 'DESC' },
        });

        const eightHoursMs = 8 * 60 * 60 * 1000;
        const dailyMap = new Map<string, number>();

        for (const attendance of attendances) {
            if (!attendance.TimeOut) {
                continue;
            }

            const day = this.formatUtcDate(attendance.TimeIn);
            const workedMs = Math.max(0, attendance.TimeOut.getTime() - attendance.TimeIn.getTime());

            dailyMap.set(day, (dailyMap.get(day) ?? 0) + workedMs);
        }

        return [...dailyMap.entries()]
            .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
            .map(([day, totalWorkedMs]) => {
                const totalWorkedHours = Number((totalWorkedMs / (60 * 60 * 1000)).toFixed(2));

                return {
                    date: day,
                    totalWorkedHours,
                    enoughEightHours: totalWorkedMs >= eightHoursMs,
                };
            });
    }

    async getTodayCheckInStatus(employeeId: string) {
        const employee = await this.employeeService.findById(employeeId);
        const now = this.nowUtc7();
        const dayStart = this.buildUtc7Threshold(now, 0);
        const dayEnd = this.buildUtc7Threshold(now, 24);

        const attendances = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoin('attendance.employee', 'employee')
            .where('employee.id = :employeeId', { employeeId: employee.id })
            .andWhere('attendance.TimeIn >= :dayStart', { dayStart })
            .andWhere('attendance.TimeIn < :dayEnd', { dayEnd })
            .orderBy('attendance.TimeIn', 'DESC')
            .getMany();

        const latest = attendances[0];

        return {
            date: this.formatUtcDate(now),
            checkedIn: attendances.length > 0,
            checkedOut: Boolean(latest?.TimeOut),
            lastCheckInAt: latest?.TimeIn ?? null,
            lastCheckOutAt: latest?.TimeOut ?? null,
            totalCheckIns: attendances.length,
        };
    }

    async getDepartmentTodayCheckInStatus(managerId: string) {
        const manager = await this.employeeService.findById(managerId);

        if (manager.roles !== ROLE.MANAGER && manager.roles !== ROLE.ADMIN) {
            throw new ForbiddenException('Only manager can view department check-in status');
        }

        if (!manager.department) {
            throw new NotFoundException('Department not found for the manager');
        }

        const now = this.nowUtc7();
        const dayStart = this.buildUtc7Threshold(now, 0);
        const dayEnd = this.buildUtc7Threshold(now, 24);
        const departmentId = manager.department.id;
        const departmentName = manager.department.name;

        const employees = await this.employeeService.findByDepartmentId(departmentId);

        const workedRows = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('employee.id', 'employeeId')
            .distinct(true)
            .innerJoin('attendance.employee', 'employee')
            .innerJoin('employee.department', 'department')
            .where('department.id = :departmentId', { departmentId })
            .andWhere('attendance.TimeIn >= :dayStart', { dayStart })
            .andWhere('attendance.TimeIn < :dayEnd', { dayEnd })
            .getRawMany<{ employeeId: string }>();

        const workedEmployeeIds = new Set<string>(workedRows.map((row) => row.employeeId));

        const employeeStatuses = employees.map((employee) => {
            return {
                employeeId: employee.id,
                email: employee.email,
                firstName: employee.firstName,
                middleName: employee.middleName ?? null,
                lastName: employee.lastName,
                worked: workedEmployeeIds.has(employee.id),
            };
        });

        const checkedInCount = employeeStatuses.filter((employee) => employee.worked).length;

        return {
            date: this.formatUtcDate(now),
            departmentId,
            departmentName,
            totalEmployees: employeeStatuses.length,
            checkedInCount,
            notCheckedInCount: employeeStatuses.length - checkedInCount,
            employees: employeeStatuses,
        };
    }

    async getMonthlyAttendanceSummary(employeeId: string, year: number, month: number) {
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new BadRequestException('Invalid month or year');
        }

        const employee = await this.employeeService.findById(employeeId);
        const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

        const attendances = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoin('attendance.employee', 'employee')
            .where('employee.id = :employeeId', { employeeId: employee.id })
            .andWhere('attendance.TimeIn >= :periodStart', { periodStart })
            .andWhere('attendance.TimeIn < :periodEnd', { periodEnd })
            .andWhere('attendance.TimeOut IS NOT NULL')
            .getMany();

        const leaveDaySets = await this.getApprovedLeaveDaySetsByEmployees([employee.id], periodStart, periodEnd);
        const approvedLeaveSet = leaveDaySets.get(employee.id) ?? new Set<string>();

        // Aggregate per local day (UTC+7): total worked ms and earliest TimeIn
        const dailyStats = new Map<string, { totalWorkedMs: number; earliestTimeIn?: Date }>();
        for (const attendance of attendances) {
            const day = this.formatUtcDate(attendance.TimeIn);
            // Skip any attendance that falls on an approved leave day
            if (approvedLeaveSet.has(day)) continue;

            const workedMs = Math.max(0, attendance.TimeOut.getTime() - attendance.TimeIn.getTime());
            const existing = dailyStats.get(day);
            const earliest = existing?.earliestTimeIn ? (attendance.TimeIn < existing.earliestTimeIn ? attendance.TimeIn : existing.earliestTimeIn) : attendance.TimeIn;
            dailyStats.set(day, {
                totalWorkedMs: (existing?.totalWorkedMs ?? 0) + workedMs,
                earliestTimeIn: earliest,
            });
        }

        const eightHoursMs = 8 * 60 * 60 * 1000;
        let enoughDays = 0;
        let lateDays = 0;

        for (const [, stats] of dailyStats.entries()) {
            if (stats.totalWorkedMs >= eightHoursMs) {
                enoughDays += 1;
            }

            if (stats.earliestTimeIn) {
                const timeInThreshold = this.buildUtc7Threshold(stats.earliestTimeIn, 8);
                if (stats.earliestTimeIn > timeInThreshold) {
                    lateDays += 1;
                }
            }
        }

        const totalWorkedHours = Number(
            (Array.from(dailyStats.values()).reduce((sum, s) => sum + s.totalWorkedMs, 0) / (60 * 60 * 1000)).toFixed(2)
        );

        const workedDays = dailyStats.size;

        const approvedLeaveDaysCount = await this.countApprovedLeaveDaysForEmployee(
            employee.id,
            periodStart,
            periodEnd,
        );

        const requiredWorkingDays = await this.calculateWorkingDaysInMonth(year, month);

        // Absent days = requiredWorkingDays - workedDays - approvedLeaveDays (clamped >= 0)
        const absentDays = Math.max(0, requiredWorkingDays - workedDays - (approvedLeaveDaysCount ?? 0));

        return {
            year,
            month,
            requiredWorkingDays,
            workedDays,
            enoughDays,
            lateDays,
            absentDays,
            totalWorkedHours,
        };
    }

    private async calculateWorkingDaysInMonth(year: number, month: number): Promise<number> {
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 1));

        let workingDays = 0;
        const currentDate = new Date(startDate);

        while (currentDate < endDate) {
            const dayOfWeek = currentDate.getUTCDay();

            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        return workingDays;
    }

    async getDepartmentMonthlyAttendanceSummary(
        managerId: string,
        year: number,
        month: number,
    ): Promise<DepartmentAttendanceSummaryResponseDto> {
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new BadRequestException('Invalid month or year');
        }

        const manager = await this.employeeService.findById(managerId);

        if (manager.roles !== ROLE.MANAGER && manager.roles !== ROLE.ADMIN) {
            throw new ForbiddenException('Only manager can view department attendance summary');
        }

        if (!manager.department) {
            throw new NotFoundException('Department not found for the manager');
        }

        const departmentId = manager.department.id;
        const departmentName = manager.department.name;
        const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

        const employees = await this.employeeService.findByDepartmentId(departmentId);
        const days = this.buildMonthDays(year, month);

        const attendances = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .leftJoinAndSelect('attendance.employee', 'employee')
            .leftJoin('employee.department', 'department')
            .where('department.id = :departmentId', { departmentId })
            .andWhere('attendance.TimeIn >= :periodStart', { periodStart })
            .andWhere('attendance.TimeIn < :periodEnd', { periodEnd })
            .orderBy('attendance.TimeIn', 'ASC')
            .getMany();

        const employeeIds = employees.map((employee) => employee.id);
        const leaveDaysByEmployee = await this.getApprovedLeaveDayCountByEmployees(
            employeeIds,
            periodStart,
            periodEnd,
        );
        const leaveDaySetsByEmployee = await this.getApprovedLeaveDaySetsByEmployees(
            employeeIds,
            periodStart,
            periodEnd,
        );

        const attendanceMap = new Map<string, { timeIn: Date; timeOut: Date | null }>();

        for (const attendance of attendances) {
            const employeeIdValue = attendance.employee?.id;
            if (!employeeIdValue) {
                continue;
            }

            const day = this.formatUtcDate(attendance.TimeIn);
            const key = `${employeeIdValue}:${day}`;
            const existing = attendanceMap.get(key);

            const nextTimeIn = !existing || attendance.TimeIn < existing.timeIn ? attendance.TimeIn : existing.timeIn;
            const nextTimeOut = this.pickLaterDate(existing?.timeOut, attendance.TimeOut);

            attendanceMap.set(key, {
                timeIn: nextTimeIn,
                timeOut: nextTimeOut,
            });
        }

        let totalOnTimeDays = 0;
        let totalLateDays = 0;
        let totalAbsentDays = 0;

        const employeeSummaries: DepartmentAttendanceEmployeeDto[] = employees.map((employee) => {
            let onTimeDays = 0;
            let lateDays = 0;
            const absentDays = leaveDaysByEmployee.get(employee.id) ?? 0;
            totalAbsentDays += absentDays;

            const approvedSet = leaveDaySetsByEmployee.get(employee.id) ?? new Set<string>();
            for (const day of days) {
                // If the day is an approved leave day, skip attendance counting for it
                if (approvedSet.has(day)) {
                    continue;
                }

                const attendance = attendanceMap.get(`${employee.id}:${day}`);

                if (!attendance) {
                    continue;
                }

                const timeInThreshold = this.buildUtc7Threshold(attendance.timeIn, 8);
                const isLate = attendance.timeIn > timeInThreshold;

                if (isLate) {
                    lateDays += 1;
                    totalLateDays += 1;
                } else {
                    onTimeDays += 1;
                    totalOnTimeDays += 1;
                }
            }

            return {
                employeeId: employee.id,
                email: employee.email,
                firstName: employee.firstName,
                middleName: employee.middleName ?? null,
                lastName: employee.lastName,
                departmentId: employee.department?.id ?? departmentId,
                departmentName: employee.department?.name ?? departmentName,
                onTimeDays,
                lateDays,
                absentDays,
            };
        });

        return {
            departmentId,
            departmentName,
            year,
            month,
            totalEmployees: employeeSummaries.length,
            totalDays: days.length,
            totalOnTimeDays,
            totalLateDays,
            totalAbsentDays,
            employees: employeeSummaries,
        };
    }

    private buildMonthDays(year: number, month: number): string[] {
        const days: string[] = [];

        for (let day = 1; ; day += 1) {
            const current = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            if (current.getUTCMonth() !== month - 1) {
                break;
            }

            days.push(this.formatUtcDate(current));
        }

        return days;
    }

    private pickLaterDate(existing: Date | null | undefined, next: Date | null | undefined): Date | null {
        if (!existing) {
            return next ?? null;
        }

        if (!next) {
            return existing;
        }

        return next > existing ? next : existing;
    }

    private toUtcDateOnly(date: Date): Date {
        const value = new Date(date);
        value.setUTCHours(0, 0, 0, 0);
        return value;
    }

    private addUtcDays(date: Date, days: number): Date {
        const value = new Date(date);
        value.setUTCDate(value.getUTCDate() + days);
        return value;
    }

    private async countApprovedLeaveDaysForEmployee(
        employeeId: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<number> {
        const leaveDaysByEmployee = await this.getApprovedLeaveDayCountByEmployees(
            [employeeId],
            periodStart,
            periodEnd,
        );

        return leaveDaysByEmployee.get(employeeId) ?? 0;
    }

    private async getApprovedLeaveDayCountByEmployees(
        employeeIds: string[],
        periodStart: Date,
        periodEnd: Date,
    ): Promise<Map<string, number>> {
        const result = new Map<string, number>();

        if (employeeIds.length === 0) {
            return result;
        }

        const leaveRequests = await this.leaveRequestRepository
            .createQueryBuilder('leaveRequest')
            .leftJoinAndSelect('leaveRequest.employee', 'employee')
            .where('employee.id IN (:...employeeIds)', { employeeIds })
            .andWhere('leaveRequest.status = :status', { status: LEAVE_REQUEST_STATUS.APPROVED })
            .andWhere('leaveRequest.date_from < :periodEnd', { periodEnd })
            .andWhere('leaveRequest.date_to >= :periodStart', { periodStart })
            .getMany();

        const periodStartDay = this.toUtcDateOnly(periodStart);
        const periodEndDay = this.addUtcDays(this.toUtcDateOnly(periodEnd), -1);
        const leaveDaySets = new Map<string, Set<string>>();

        for (const leaveRequest of leaveRequests) {
            const employeeId = leaveRequest.employee?.id;
            if (!employeeId) {
                continue;
            }

            const requestStart = this.toUtcDateOnly(leaveRequest.date_from);
            const requestEnd = this.toUtcDateOnly(leaveRequest.date_to);
            const overlapStart = requestStart > periodStartDay ? requestStart : periodStartDay;
            const overlapEnd = requestEnd < periodEndDay ? requestEnd : periodEndDay;

            if (overlapStart > overlapEnd) {
                continue;
            }

            const days = leaveDaySets.get(employeeId) ?? new Set<string>();
            for (
                let current = overlapStart;
                current <= overlapEnd;
                current = this.addUtcDays(current, 1)
            ) {
                days.add(this.formatUtcDate(current));
            }

            leaveDaySets.set(employeeId, days);
        }

        for (const [employeeId, daySet] of leaveDaySets.entries()) {
            result.set(employeeId, daySet.size);
        }

        return result;
    }

    private async getApprovedLeaveDaySetsByEmployees(
        employeeIds: string[],
        periodStart: Date,
        periodEnd: Date,
    ): Promise<Map<string, Set<string>>> {
        const result = new Map<string, Set<string>>();

        if (employeeIds.length === 0) {
            return result;
        }

        const leaveRequests = await this.leaveRequestRepository
            .createQueryBuilder('leaveRequest')
            .leftJoinAndSelect('leaveRequest.employee', 'employee')
            .where('employee.id IN (:...employeeIds)', { employeeIds })
            .andWhere('leaveRequest.status = :status', { status: LEAVE_REQUEST_STATUS.APPROVED })
            .andWhere('leaveRequest.date_from < :periodEnd', { periodEnd })
            .andWhere('leaveRequest.date_to >= :periodStart', { periodStart })
            .getMany();

        const periodStartDay = this.toUtcDateOnly(periodStart);
        const periodEndDay = this.addUtcDays(this.toUtcDateOnly(periodEnd), -1);
        const leaveDaySets = new Map<string, Set<string>>();

        for (const leaveRequest of leaveRequests) {
            const employeeId = leaveRequest.employee?.id;
            if (!employeeId) {
                continue;
            }

            const requestStart = this.toUtcDateOnly(leaveRequest.date_from);
            const requestEnd = this.toUtcDateOnly(leaveRequest.date_to);
            const overlapStart = requestStart > periodStartDay ? requestStart : periodStartDay;
            const overlapEnd = requestEnd < periodEndDay ? requestEnd : periodEndDay;

            if (overlapStart > overlapEnd) {
                continue;
            }

            const days = leaveDaySets.get(employeeId) ?? new Set<string>();
            for (
                let current = overlapStart;
                current <= overlapEnd;
                current = this.addUtcDays(current, 1)
            ) {
                days.add(this.formatUtcDate(current));
            }

            leaveDaySets.set(employeeId, days);
        }

        // Ensure entries exist for all requested employeeIds
        for (const id of employeeIds) {
            if (!leaveDaySets.has(id)) leaveDaySets.set(id, new Set<string>());
        }

        return leaveDaySets;
    }
}