import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeService } from 'src/auth/service/employee.service';
import { CreateLeaveRequestDto, LeaveRequestListDto, ProcessLeaveRequestDto, QueryLeaveRequestDto, UpdateLeaveRequestDto } from '../dto/leave-request';
import { LeaveRequest } from '../entity/leave-request.entity';
import { LEAVE_REQUEST_STATUS, ROLE } from '../entity/constants';
import { plainToInstance } from 'class-transformer';
import { LeaveRequestDto } from '../dto/leave-request';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly employeeService: EmployeeService,
  ) {}

  async submitLeaveRequest(employeeId: string, dto: CreateLeaveRequestDto) {
    const employee = await this.employeeService.findById(employeeId);

    const dateFrom = new Date(dto.date_from);
    const dateTo = new Date(dto.date_to);

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Invalid leave date range');
    }

    if (dateFrom > dateTo) {
      throw new BadRequestException('date_from must be before or equal to date_to');
    }

    const leaveRequest = this.leaveRequestRepository.create({
      employee,
      date_from: dateFrom,
      date_to: dateTo,
      reason: dto.reason,
      description: dto.description ?? '',
    });

    return this.leaveRequestRepository.save(leaveRequest);
  }

  async getMyLeaveRequests(employeeId: string, query: QueryLeaveRequestDto) {
    await this.employeeService.findById(employeeId);

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const qb = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.approved_by', 'approvedBy')
      .where('employee.id = :employeeId', { employeeId });

    if (query.search) {
      const search = `%${query.search}%`;
      qb.andWhere('(leaveRequest.reason LIKE :search OR leaveRequest.description LIKE :search)', {
        search,
      });
    }

    if (query.fromDate) {
      qb.andWhere('leaveRequest.date_from >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }

    if (query.toDate) {
      qb.andWhere('leaveRequest.date_to <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    qb.orderBy('leaveRequest.created_at', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: plainToInstance(LeaveRequestListDto, items, { excludeExtraneousValues: true }),
      total,
      page,
      pageSize,
    };
  }

  async getDepartmentLeaveRequestsForManager(managerId: string, query: QueryLeaveRequestDto) {
    const manager = await this.employeeService.findById(managerId);

    if (manager.roles !== ROLE.MANAGER) {
      throw new ForbiddenException('Only manager can view department leave requests');
    }

    if (!manager.department) {
      throw new NotFoundException('Department not found for the manager');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const qb = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.approved_by', 'approvedBy')
      .leftJoin('employee.department', 'department')
      .where('department.id = :departmentId', { departmentId: manager.department.id });

    if (query.employeeId) {
      qb.andWhere('employee.id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.search) {
      const search = `%${query.search}%`;
      qb.andWhere(
        `(leaveRequest.reason LIKE :search OR employee.firstName LIKE :search OR employee.middleName LIKE :search OR employee.lastName LIKE :search)`,
        { search },
      );
    }

    if (query.fromDate) {
      qb.andWhere('leaveRequest.date_from >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }

    if (query.toDate) {
      qb.andWhere('leaveRequest.date_to <= :toDate', {
        toDate: new Date(query.toDate),
      });
    }

    qb.orderBy('leaveRequest.created_at', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: plainToInstance(LeaveRequestListDto, items, { excludeExtraneousValues: true }),
      total,
      page,
      pageSize,
    };
  }

  async getLeaveRequestDetail(requesterId: string, leaveRequestId: string) {
    const requester = await this.employeeService.findById(requesterId);

    const leaveRequest = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.approved_by', 'approvedBy')
      .leftJoinAndSelect('employee.department', 'department')
      .where('leaveRequest.id = :leaveRequestId', { leaveRequestId })
      .getOne();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (requester.roles === ROLE.ADMIN) {
      return plainToInstance(LeaveRequestDto, leaveRequest, { excludeExtraneousValues: true });
    }

    if (requester.roles === ROLE.MANAGER) {
      if (!requester.department) {
        throw new NotFoundException('Department not found for the manager');
      }
      if (leaveRequest.employee?.department?.id !== requester.department.id) {
        throw new ForbiddenException('You can only view leave requests in your department');
      }
      return plainToInstance(LeaveRequestDto, leaveRequest, { excludeExtraneousValues: true });
    }

    if (leaveRequest.employee?.id !== requesterId) {
      throw new ForbiddenException('You can only view your own leave request');
    }

    return plainToInstance(LeaveRequestDto, leaveRequest, { excludeExtraneousValues: true });
  }

  async deleteMyLeaveRequest(employeeId: string, leaveRequestId: string): Promise<void> {
    await this.employeeService.findById(employeeId);

    const leaveRequest = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .where('leaveRequest.id = :leaveRequestId', { leaveRequestId })
      .getOne();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.employee?.id !== employeeId) {
      throw new ForbiddenException('You can only delete your own leave request');
    }

    if (leaveRequest.status === LEAVE_REQUEST_STATUS.APPROVED || leaveRequest.status === LEAVE_REQUEST_STATUS.REJECTED) {
      throw new BadRequestException('Approved leave request cannot be deleted');
    }

    await this.leaveRequestRepository.remove(leaveRequest);
  }

  async updateMyLeaveRequest(
    employeeId: string,
    leaveRequestId: string,
    dto: UpdateLeaveRequestDto,
  ) {
    await this.employeeService.findById(employeeId);

    const leaveRequest = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.approved_by', 'approvedBy')
      .where('leaveRequest.id = :leaveRequestId', { leaveRequestId })
      .getOne();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.employee?.id !== employeeId) {
      throw new ForbiddenException('You can only update your own leave request');
    }

    if (leaveRequest.status !== LEAVE_REQUEST_STATUS.PENDING) {
      throw new BadRequestException('Only pending leave request can be updated');
    }

    const hasAnyField =
      dto.date_from !== undefined ||
      dto.date_to !== undefined ||
      dto.reason !== undefined ||
      dto.description !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException('No fields provided for update');
    }

    const nextDateFrom = dto.date_from ? new Date(dto.date_from) : leaveRequest.date_from;
    const nextDateTo = dto.date_to ? new Date(dto.date_to) : leaveRequest.date_to;

    if (Number.isNaN(nextDateFrom.getTime()) || Number.isNaN(nextDateTo.getTime())) {
      throw new BadRequestException('Invalid leave date range');
    }

    if (nextDateFrom > nextDateTo) {
      throw new BadRequestException('date_from must be before or equal to date_to');
    }

    leaveRequest.date_from = nextDateFrom;
    leaveRequest.date_to = nextDateTo;

    if (dto.reason !== undefined) {
      leaveRequest.reason = dto.reason;
    }

    if (dto.description !== undefined) {
      leaveRequest.description = dto.description;
    }

    const updated = await this.leaveRequestRepository.save(leaveRequest);
    return plainToInstance(LeaveRequestDto, updated, { excludeExtraneousValues: true });
  }

  async getMyLeaveSummary(employeeId: string) {
    await this.employeeService.findById(employeeId);

    const rows = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoin('leaveRequest.employee', 'employee')
      .select('leaveRequest.status', 'status')
      .addSelect('COUNT(leaveRequest.id)', 'count')
      .where('employee.id = :employeeId', { employeeId })
      .groupBy('leaveRequest.status')
      .getRawMany<{ status: LEAVE_REQUEST_STATUS; count: string }>();

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);
      summary.total += count;
      if (row.status === LEAVE_REQUEST_STATUS.PENDING) summary.pending = count;
      if (row.status === LEAVE_REQUEST_STATUS.APPROVED) summary.approved = count;
      if (row.status === LEAVE_REQUEST_STATUS.REJECTED) summary.rejected = count;
    }

    return summary;
  }

  async getDepartmentLeaveSummary(managerId: string) {
    const manager = await this.employeeService.findById(managerId);

    if (manager.roles !== ROLE.MANAGER) {
      throw new ForbiddenException('Only manager can view department leave summary');
    }

    if (!manager.department) {
      throw new NotFoundException('Department not found for the manager');
    }

    const rows = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoin('leaveRequest.employee', 'employee')
      .leftJoin('employee.department', 'department')
      .select('leaveRequest.status', 'status')
      .addSelect('COUNT(leaveRequest.id)', 'count')
      .where('department.id = :departmentId', { departmentId: manager.department.id })
      .groupBy('leaveRequest.status')
      .getRawMany<{ status: LEAVE_REQUEST_STATUS; count: string }>();

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);
      summary.total += count;
      if (row.status === LEAVE_REQUEST_STATUS.PENDING) summary.pending = count;
      if (row.status === LEAVE_REQUEST_STATUS.APPROVED) summary.approved = count;
      if (row.status === LEAVE_REQUEST_STATUS.REJECTED) summary.rejected = count;
    }

    return summary;
  }

  async processLeaveRequest(managerId: string, leaveRequestId: string, dto: ProcessLeaveRequestDto) {
    const manager = await this.employeeService.findById(managerId);

    if (manager.roles !== ROLE.MANAGER) {
      throw new ForbiddenException('Only manager can approve or reject leave requests');
    }

    if (!manager.department) {
      throw new NotFoundException('Department not found for the manager');
    }

    const leaveRequest = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('leaveRequest.approved_by', 'approvedBy')
      .leftJoinAndSelect('employee.department', 'department')
      .where('leaveRequest.id = :leaveRequestId', { leaveRequestId })
      .getOne();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.employee?.department?.id !== manager.department.id) {
      throw new ForbiddenException('You can only process leave requests in your department');
    }

    if (leaveRequest.status !== LEAVE_REQUEST_STATUS.PENDING) {
      throw new BadRequestException('Leave request has already been processed');
    }

    if (
      dto.status !== LEAVE_REQUEST_STATUS.APPROVED &&
      dto.status !== LEAVE_REQUEST_STATUS.REJECTED
    ) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }

    leaveRequest.status = dto.status;
    leaveRequest.approved_by = manager;

    if (dto.description) {
      leaveRequest.description = dto.description;
    }

    return this.leaveRequestRepository.save(leaveRequest);
  }
}
