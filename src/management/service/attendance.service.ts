import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";

import { Attendance } from "../entity/attendance.entity";
import { QueryAttendanceDto } from "../dto/attendance";
import { DepartmentAttendanceEmployeeDto, DepartmentAttendanceSummaryResponseDto } from "../dto/attendance";
import { ROLE } from "../entity/constants";
import { EmployeeService } from "../../auth/service/employee.service";

@Injectable()
export class AttendanceService {
    private readonly standardWorkingDays = 26;

    constructor(
        @InjectRepository(Attendance)
        private readonly attendanceRepository: Repository<Attendance>,
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
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
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

        const dailyWorkedMs = new Map<string, number>();
        for (const attendance of attendances) {
            const day = this.formatUtcDate(attendance.TimeIn);
            const workedMs = Math.max(0, attendance.TimeOut.getTime() - attendance.TimeIn.getTime());
            dailyWorkedMs.set(day, (dailyWorkedMs.get(day) ?? 0) + workedMs);
        }

        const eightHoursMs = 8 * 60 * 60 * 1000;
        let enoughDays = 0;
        let lateDays = 0;

        for (const totalWorkedMs of dailyWorkedMs.values()) {
            if (totalWorkedMs >= eightHoursMs) {
                enoughDays += 1;
            } else {
                lateDays += 1;
            }
        }

        const totalWorkedHours = Number(
            (Array.from(dailyWorkedMs.values()).reduce((sum, workedMs) => sum + workedMs, 0) / (60 * 60 * 1000)).toFixed(2)
        );
        const workedDays = enoughDays + lateDays;
        const absentDays = Math.max(0, this.standardWorkingDays - workedDays);

        return {
            year,
            month,
            requiredWorkingDays: this.standardWorkingDays,
            workedDays,
            enoughDays,
            lateDays,
            absentDays,
            totalWorkedHours,
        };
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
            let absentDays = 0;

            for (const day of days) {
                const attendance = attendanceMap.get(`${employee.id}:${day}`);

                if (!attendance) {
                    absentDays += 1;
                    totalAbsentDays += 1;
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
}