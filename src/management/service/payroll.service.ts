import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeService } from 'src/auth/service/employee.service';
import { Repository } from 'typeorm';
import { Attendance } from '../entity/attendance.entity';
import { PAYROLL_STATUS, Payroll } from '../entity/payroll.entity';

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
      .where('attendance.employee_id = :employeeId', { employeeId })
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
    const deduction = 0;
    const allowance = 0;
    const taxAmount = 0;
    const netSalary = this.round2(grossSalary + allowance - deduction - taxAmount);

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

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }
}