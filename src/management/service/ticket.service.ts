import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Employee } from 'src/auth/entity/employee.entity';
import {
  AssignTicketDto,
  CreateTicketDto,
  CreateTicketProcessDto,
  QueryTicketDto,
  TicketListResponseDto,
  TicketResponseDto,
  UpdateTicketDto,
  UpdateTicketStatusDto,
} from '../dto';
import { Ticket } from '../entity/ticket.entity';
import { TicketProcess, TICKET_PROCESS_TYPE } from '../entity/ticket-process.entity';
import { TICKET_STATUS } from '../entity/constants';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketProcess)
    private readonly ticketProcessRepository: Repository<TicketProcess>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new ticket (automatically creates CREATED process)
   */
  async createTicket(dto: CreateTicketDto, employeeId: string): Promise<Ticket> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify employee exists
      const employee = await this.findEmployeeOrThrow(employeeId);

      // Create ticket
      const ticket = queryRunner.manager.create(Ticket, {
        employee,
        category: dto.category,
        title: dto.title.trim(),
        description: dto.description.trim(),
        status: TICKET_STATUS.OPEN,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedTicket = await queryRunner.manager.save(ticket);

      // Create CREATED process
      const process = queryRunner.manager.create(TicketProcess, {
        ticket: savedTicket,
        actor: employee,
        type: TICKET_PROCESS_TYPE.CREATED,
        note: 'Ticket created',
        created_at: new Date(),
      });

      await queryRunner.manager.save(process);
      await queryRunner.commitTransaction();

      return this.getTicketById(savedTicket.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get list of tickets with filters and pagination
   */
  async getTickets(query: QueryTicketDto) {
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'DESC';

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.employee', 'employee')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.processes', 'processes');

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('ticket.category = :category', { category: query.category });
    }

    if (query.employee_id) {
      qb.andWhere('employee.id = :employee_id', { employee_id: query.employee_id });
    }

    if (query.assignee_id) {
      qb.andWhere('assignee.id = :assignee_id', { assignee_id: query.assignee_id });
    }

    if (query.keyword) {
      qb.andWhere(
        '(ticket.title LIKE :keyword OR ticket.description LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    if (query.from_date) {
      qb.andWhere('ticket.created_at >= :from_date', {
        from_date: new Date(query.from_date),
      });
    }

    if (query.to_date) {
      qb.andWhere('ticket.created_at <= :to_date', {
        to_date: new Date(query.to_date),
      });
    }

    qb.orderBy(`ticket.${sortBy}`, sortOrder);

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    return {
      items: plainToInstance(TicketResponseDto, items, { excludeExtraneousValues: true }),
      total,
      page,
      limit,
      total_pages: totalPages,
    };
  }

  /**
   * Get ticket by ID with relations
   */
  async getTicketById(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['employee', 'assignee', 'processes'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    return ticket;
  }

  /**
   * Update ticket (title, description, category only)
   */
  async updateTicket(ticketId: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.getTicketById(ticketId);

    if (dto.title !== undefined) {
      ticket.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      ticket.description = dto.description.trim();
    }

    if (dto.category !== undefined) {
      ticket.category = dto.category;
    }

    ticket.updated_at = new Date();

    await this.ticketRepository.save(ticket);
    return this.getTicketById(ticketId);
  }

  /**
   * Delete ticket (soft delete recommended, but this does hard delete)
   */
  async deleteTicket(ticketId: string): Promise<void> {
    const ticket = await this.getTicketById(ticketId);
    await this.ticketRepository.remove(ticket);
  }

  /**
   * Assign ticket to an employee (creates ASSIGNED process)
   */
  async assignTicket(ticketId: string, dto: AssignTicketDto): Promise<Ticket> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get current user context (would come from request, using assignee_id as actor placeholder)
      // In real scenario, get from JWT token
      const assignee = await this.findEmployeeOrThrow(dto.assignee_id);

      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
        relations: ['assignee'],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      const oldAssignee = ticket.assignee;
      ticket.assignee = assignee;
      ticket.updated_at = new Date();

      const savedTicket = await queryRunner.manager.save(ticket);

      // Create ASSIGNED process
      const process = queryRunner.manager.create(TicketProcess, {
        ticket: savedTicket,
        actor: assignee, // In real scenario, this would be the current user
        assignee: assignee,
        type: TICKET_PROCESS_TYPE.ASSIGNED,
        note: dto.note,
        created_at: new Date(),
      });

      await queryRunner.manager.save(process);
      await queryRunner.commitTransaction();

      return this.getTicketById(ticketId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update ticket status (creates STATUS_CHANGED process)
   */
  async updateTicketStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
    actorId: string, // Would come from JWT in real scenario
  ): Promise<Ticket> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const actor = await this.findEmployeeOrThrow(actorId);

      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      const fromStatus = ticket.status;
      ticket.status = dto.status;
      ticket.updated_at = new Date();

      const savedTicket = await queryRunner.manager.save(ticket);

      // Create STATUS_CHANGED process
      const process = queryRunner.manager.create(TicketProcess, {
        ticket: savedTicket,
        actor,
        type: TICKET_PROCESS_TYPE.STATUS_CHANGED,
        from_status: fromStatus,
        to_status: dto.status,
        note: dto.note ?? undefined,
        created_at: new Date(),
      });

      await queryRunner.manager.save(process);
      await queryRunner.commitTransaction();

      return this.getTicketById(ticketId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Add a comment/note to ticket (creates COMMENT process)
   */
  async addTicketProcess(
    ticketId: string,
    dto: CreateTicketProcessDto,
    actorId: string,
  ): Promise<TicketProcess> {
    const ticket = await this.getTicketById(ticketId);
    const actor = await this.findEmployeeOrThrow(actorId);

    const process = this.ticketProcessRepository.create({
      ticket,
      actor,
      type: TICKET_PROCESS_TYPE.COMMENT,
      note: dto.note.trim(),
      created_at: new Date(),
    });

    return this.ticketProcessRepository.save(process);
  }

  /**
   * Get ticket timeline/processes
   */
  async getTicketTimeline(ticketId: string) {
    const ticket = await this.getTicketById(ticketId);

    const processes = await this.ticketProcessRepository.find({
      where: { ticket: { id: ticketId } },
      relations: ['actor', 'assignee'],
      order: { created_at: 'DESC' },
    });

    return {
      processes,
      total_activities: processes.length,
    };
  }

  /**
   * Get tickets created by current user
   */
  async getMyTickets(employeeId: string, query: Omit<QueryTicketDto, 'employee_id'>) {
    return this.getTickets({
      ...query,
      employee_id: employeeId,
    });
  }

  /**
   * Get tickets assigned to current user
   */
  async getAssignedToMe(employeeId: string, query: Omit<QueryTicketDto, 'assignee_id'>) {
    return this.getTickets({
      ...query,
      assignee_id: employeeId,
    });
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats() {
    const qb = this.ticketRepository.createQueryBuilder('ticket');

    const statsByStatus = await qb
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    const qb2 = this.ticketRepository.createQueryBuilder('ticket');
    const statsByCategory = await qb2
      .select('ticket.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.category')
      .getRawMany();

    const total = await this.ticketRepository.count();

    return {
      total,
      by_status: statsByStatus,
      by_category: statsByCategory,
    };
  }

  /**
   * Helper: Find employee or throw
   */
  private async findEmployeeOrThrow(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    return employee;
  }
}
function leftJoinAndSelect(arg0: string, arg1: string) {
  throw new Error('Function not implemented.');
}

