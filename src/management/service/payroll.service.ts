import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Attendance } from '../entity/attendance.entity';
import { PAYROLL_STATUS, Payroll } from '../entity/payroll.entity';

import { EmployeeService } from '../../auth/service/employee.service';

@Injectable()
export class PayrollService {
  private readonly standardWorkingDays = 26;
  private readonly standardWorkingHoursPerDay = 8;
  private readonly overtimeRate = 1.5;

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly employeeService: EmployeeService,
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
    const standardHours = this.standardWorkingDays * this.standardWorkingHoursPerDay;
    const basicSalarySnapshot = Number(employee.basicSalary);
    const hourlyRate = basicSalarySnapshot / standardHours;

    const regularHours = Math.min(workedHours, standardHours);
    const overtimeHours = this.round2(Math.max(0, workedHours - standardHours));

    const grossSalary = this.round2(regularHours * hourlyRate + overtimeHours * hourlyRate * this.overtimeRate);

    // Công thức lương Việt Nam
    const insuranceAmount = this.round2(grossSalary * 0.105); // BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%
    const dependants = employee.numberOfChildren ?? 0;
    const taxableIncome = Math.max(0, grossSalary - insuranceAmount - 15_500_000 - 6_200_000 * dependants);
    console.log(taxableIncome);
    
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