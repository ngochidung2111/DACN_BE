import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { EmployeeService } from "src/auth/service/employee.service";
import { Attendance } from "../entity/attendance.entity";

@Injectable()
export class AttendanceService {
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

    async getAttendanceByEmployee(employeeId: string) {
        const employee = await this.employeeService.findById(employeeId);
        const attendances = await this.attendanceRepository.find({
            where: { employee: { id: employee.id } },
            order: { TimeIn: 'DESC' },
        });
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
}