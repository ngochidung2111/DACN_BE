import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';


import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportDto,
  ReportListResponseDto,
  ReportResponseDto,
} from '../dto';
import { Report } from '../entity/report.entity';
import { REPORT_STATUS } from '../entity/constants';
import { Employee } from '../../auth/entity/employee.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new report
   */
  async createReport(
    dto: CreateReportDto,
    employeeId: string,
  ): Promise<Report> {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Create report directly
    const report = new Report();
    report.employee = employee;
    report.week_starting = new Date(dto.week_starting);
    report.accomplishment = dto.accomplishment;
    report.in_progress = dto.in_progress;
    report.plan = dto.plan;
    report.blocker = dto.blocker ? dto.blocker : null;
    report.progress_percentage = dto.progress_percentage || 0;
    report.progress_notes = dto.progress_notes ? dto.progress_notes : null;
    report.status = REPORT_STATUS.DRAFT;
    report.created_at = new Date();
    report.updated_at = new Date();

    return this.reportRepository.save(report);
  }

  /**
   * Get all reports with filters and pagination
   */
  async getReports(query: QueryReportDto): Promise<ReportListResponseDto> {
    const { page, limit, sort_by, sort_order, employee_id, status, from_date, to_date } = query;

    const qb = this.reportRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.employee', 'employee');

    if (employee_id) {
      qb.andWhere('report.employee_id = :employee_id', { employee_id });
    }

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    if (from_date) {
      qb.andWhere('report.week_starting >= :from_date', {
        from_date: new Date(from_date),
      });
    }

    if (to_date) {
      qb.andWhere('report.week_starting <= :to_date', {
        to_date: new Date(to_date),
      });
    }

    const total = await qb.getCount();

    const reports = await qb
      .orderBy(
        `report.${sort_by || 'week_starting'}`,
        sort_order || 'DESC',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const total_pages = Math.ceil(total / limit);

    return {
      data: plainToInstance(ReportResponseDto, reports, {
        excludeExtraneousValues: true,
      }),
      total,
      page,
      limit,
      total_pages,
    };
  }

  /**
   * Get my reports (created by current user)
   */
  async getMyReports(
    employeeId: string,
    query: Omit<QueryReportDto, 'employee_id'>,
  ): Promise<ReportListResponseDto> {
    const modifiedQuery: QueryReportDto = {
      ...query,
      employee_id: employeeId,
    };

    return this.getReports(modifiedQuery);
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Update report
   */
  async updateReport(
    id: string,
    dto: UpdateReportDto,
  ): Promise<Report> {
    const report = await this.getReportById(id);

    if (report.status === REPORT_STATUS.SUBMITTED) {
      throw new BadRequestException('Cannot update a submitted report');
    }

    Object.assign(report, {
      ...dto,
      updated_at: new Date(),
    });

    return this.reportRepository.save(report);
  }

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<void> {
    const report = await this.getReportById(id);

    if (report.status === REPORT_STATUS.SUBMITTED) {
      throw new BadRequestException('Cannot delete a submitted report');
    }

    await this.reportRepository.delete(id);
  }

  /**
   * Submit report
   */
  async submitReport(id: string): Promise<Report> {
    const report = await this.getReportById(id);

    if (report.status !== REPORT_STATUS.DRAFT) {
      throw new BadRequestException('Only draft reports can be submitted');
    }

    report.status = REPORT_STATUS.SUBMITTED;
    report.updated_at = new Date();

    return this.reportRepository.save(report);
  }

  /**
   * Get reports by employee (for managers)
   */
  async getTeamReports(
    query: QueryReportDto,
  ): Promise<ReportListResponseDto> {
    return this.getReports(query);
  }
}
