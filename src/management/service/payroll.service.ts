import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Attendance } from '../entity/attendance.entity';
import { LeaveRequest } from '../entity/leave-request.entity';
import { LEAVE_REQUEST_STATUS, LEAVE_REQUEST_TYPE } from '../entity/constants';
import { PAYROLL_STATUS, Payroll } from '../entity/payroll.entity';
import { Holiday } from '../entity/holiday.entity';
import { EmployeeService } from '../../auth/service/employee.service';
import { HolidayService } from './holiday.service';

@Injectable()
export class PayrollService {
  private readonly standardWorkingHoursPerDay = 8;
  private readonly overtimeRate = 1.5;

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly employeeService: EmployeeService,
    private readonly holidayService: HolidayService,
  ) {}

  async generateMonthlyPayroll(employeeId: string, year: number, month: number): Promise<Payroll> {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid payroll period');
    }

    const employee = await this.employeeService.findById(employeeId);
    if (!employee.basicSalary || Number(employee.basicSalary) <= 0) {
      throw new BadRequestException('Employee basicSalary is required to calculate payroll');
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    // Calculate working days excluding weekends and holidays
    const standardWorkingDays = await this.calculateWorkingDaysInMonth(year, month);
    const leaveBreakdown = await this.getLeaveBreakdownInMonth(employeeId, year, month);

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.employee', 'employee')
      .where('employee.id = :employeeId', { employeeId })
      .andWhere('attendance.TimeIn >= :periodStart', { periodStart })
      .andWhere('attendance.TimeIn < :periodEnd', { periodEnd })
      .andWhere('attendance.TimeOut IS NOT NULL')
      .getMany();

    const totalWorkedMs = attendances.reduce((sum, attendance) => {
      const workedMs = attendance.TimeOut.getTime() - attendance.TimeIn.getTime();
      return sum + Math.max(0, workedMs);
    }, 0);

    const workedHours = this.round2(totalWorkedMs / (1000 * 60 * 60));
    const standardHours = standardWorkingDays * this.standardWorkingHoursPerDay;
    const basicSalarySnapshot = Number(employee.basicSalary);
    const hourlyRate = basicSalarySnapshot / standardHours;
    const paidLeaveHours = this.round2(leaveBreakdown.paidLeaveDays * this.standardWorkingHoursPerDay);
    const unpaidLeaveHours = this.round2(leaveBreakdown.unpaidLeaveDays * this.standardWorkingHoursPerDay);
    const paidHours = workedHours + paidLeaveHours;

    const regularHours = Math.min(paidHours, standardHours);
    const overtimeHours = this.round2(Math.max(0, workedHours - standardHours));

    const grossSalary = this.round2(regularHours * hourlyRate + overtimeHours * hourlyRate * this.overtimeRate);

    // Công thức lương Việt Nam
    const insuranceAmount = this.round2(grossSalary * 0.105); // BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%
    const dependants = employee.numberOfChildren ?? 0;
    const taxableIncome = Math.max(0, grossSalary - insuranceAmount - 15_500_000 - 6_200_000 * dependants);
    
    const taxAmount = this.calculatePIT(taxableIncome);
    const deduction = 0;
    const allowance = 0;
    const netSalary = this.round2(grossSalary - insuranceAmount - taxAmount + allowance - deduction);

    const existingPayroll = await this.payrollRepository.findOne({
      where: { employeeId, year, month },
    });

    const payroll = existingPayroll ?? this.payrollRepository.create({ employee, employeeId, year, month });

    payroll.employee = employee;
    payroll.employeeId = employeeId;
    payroll.year = year;
    payroll.month = month;
    payroll.basicSalarySnapshot = this.round2(basicSalarySnapshot);
    payroll.workedHours = workedHours;
    payroll.paidLeaveDays = leaveBreakdown.paidLeaveDays;
    payroll.paidLeaveHours = paidLeaveHours;
    payroll.unpaidLeaveDays = leaveBreakdown.unpaidLeaveDays;
    payroll.unpaidLeaveHours = unpaidLeaveHours;
    payroll.overtimeHours = overtimeHours;
    payroll.insuranceAmount = insuranceAmount;
    payroll.allowance = allowance;
    payroll.deduction = deduction;
    payroll.taxAmount = taxAmount;
    payroll.grossSalary = grossSalary;
    payroll.netSalary = netSalary;
    payroll.status = existingPayroll?.status ?? PAYROLL_STATUS.DRAFT;

    return this.payrollRepository.save(payroll);
  }

  async getMyPayrollByMonth(employeeId: string, year: number, month: number): Promise<Payroll | null> {
    return this.payrollRepository.findOne({
      where: { employeeId, year, month },
      relations: ['employee'],
    });
  }

  async getWorkingDaysInMonth(year: number, month: number): Promise<number> {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid period');
    }

    return this.calculateWorkingDaysInMonth(year, month);
  }

  private isPaidLeaveType(type: LEAVE_REQUEST_TYPE): boolean {
    return [
      LEAVE_REQUEST_TYPE.ANNUAL,
      LEAVE_REQUEST_TYPE.SICK,
      LEAVE_REQUEST_TYPE.PERSONAL,
      LEAVE_REQUEST_TYPE.MATERNITY,
      LEAVE_REQUEST_TYPE.PATERNITY,
      LEAVE_REQUEST_TYPE.COMPENSATORY,
    ].includes(type);
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

  private formatUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async getLeaveBreakdownInMonth(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<{ paidLeaveDays: number; unpaidLeaveDays: number }> {
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1));
    const periodStartDay = this.toUtcDateOnly(periodStart);
    const periodEndDay = this.addUtcDays(this.toUtcDateOnly(periodEnd), -1);

    const holidays = await this.holidayService.getHolidaysByMonth(year, month);
    const holidayDates = new Set(holidays.map((h) => this.formatUtcDate(h.date)));

    const leaveRequests = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoin('leaveRequest.employee', 'employee')
      .where('employee.id = :employeeId', { employeeId })
      .andWhere('leaveRequest.status = :status', { status: LEAVE_REQUEST_STATUS.APPROVED })
      .andWhere('leaveRequest.date_from < :periodEnd', { periodEnd })
      .andWhere('leaveRequest.date_to >= :periodStart', { periodStart })
      .getMany();

    const paidLeaveDaysSet = new Set<string>();
    const unpaidLeaveDaysSet = new Set<string>();

    for (const leaveRequest of leaveRequests) {
      const requestStart = this.toUtcDateOnly(leaveRequest.date_from);
      const requestEnd = this.toUtcDateOnly(leaveRequest.date_to);
      const overlapStart = requestStart > periodStartDay ? requestStart : periodStartDay;
      const overlapEnd = requestEnd < periodEndDay ? requestEnd : periodEndDay;

      if (overlapStart > overlapEnd) {
        continue;
      }

      const targetSet = this.isPaidLeaveType(leaveRequest.type) ? paidLeaveDaysSet : unpaidLeaveDaysSet;

      for (let current = overlapStart; current <= overlapEnd; current = this.addUtcDays(current, 1)) {
        const dayOfWeek = current.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const dateKey = this.formatUtcDate(current);
        if (holidayDates.has(dateKey)) {
          continue;
        }

        targetSet.add(dateKey);
      }
    }

    return {
      paidLeaveDays: paidLeaveDaysSet.size,
      unpaidLeaveDays: unpaidLeaveDaysSet.size,
    };
  }

  /**
   * Tính số ngày làm việc trong tháng (trừ thứ 7, chủ nhật và ngày lễ)
   */
  private async calculateWorkingDaysInMonth(year: number, month: number): Promise<number> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // Get all holidays in the month
    const holidays = await this.holidayService.getHolidaysByMonth(year, month);
    const holidayDates = new Set(holidays.map((h) => this.formatUtcDate(h.date)));

    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getUTCDay();
      const dateString = this.formatUtcDate(currentDate);

      // Kiểm tra nếu không phải thứ 7 (6) hoặc chủ nhật (0) và không phải ngày lễ
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateString)) {
        workingDays++;
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return workingDays;
  }

  /**
   * Tính PIT (thuế TNCN) theo bảng lũy tiến từng phần Việt Nam (tháng)
   * Các bậc: 5% / 10% / 15% / 20% / 25% / 30% / 35%
   */
  private calculatePIT(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;

    const brackets: { limit: number; rate: number }[] = [
      { limit: 5_000_000, rate: 0.05 },
      { limit: 10_000_000, rate: 0.10 },
      { limit: 18_000_000, rate: 0.15 },
      { limit: 32_000_000, rate: 0.20 },
      { limit: 52_000_000, rate: 0.25 },
      { limit: 80_000_000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 },
    ];

    let tax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;

    for (const bracket of brackets) {
      const bracketSize = bracket.limit - prevLimit;
      const taxableInBracket = Math.min(remaining, bracketSize);
      tax += taxableInBracket * bracket.rate;
      remaining -= taxableInBracket;
      prevLimit = bracket.limit;
      if (remaining <= 0) break;
    }

    return this.round2(tax);
  }

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }
}