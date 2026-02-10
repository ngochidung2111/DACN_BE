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
}