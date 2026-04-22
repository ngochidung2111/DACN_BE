import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';



import {
  AssignDepartmentTicketCategoriesDto,
  AssignTicketDto,
  CreateTicketDto,
  CreateTicketCategoryDto,
  CreateTicketProcessDto,
  QueryTicketCategoryDto,
  QueryTicketDto,
  TicketListResponseDto,
  TicketResponseDto,
  UpdateTicketDto,
  UpdateTicketStatusDto,
} from '../dto';
import { Ticket } from '../entity/ticket.entity';
import { TicketCategory } from '../entity/ticket-category.entity';
import { TicketProcess, TICKET_PROCESS_TYPE } from '../entity/ticket-process.entity';
import { TICKET_STATUS } from '../entity/constants';
import { ROLE } from '../entity/constants';
import { plainToInstance } from 'class-transformer';
import { Employee } from '../../auth/entity/employee.entity';
import { Department } from '../../auth/entity/department.entity';
import { Notification } from '../entity/notification.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketProcess)
    private readonly ticketProcessRepository: Repository<TicketProcess>,
    @InjectRepository(TicketCategory)
    private readonly ticketCategoryRepository: Repository<TicketCategory>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
      // Verify employee exists and determine department-level category permissions
      const employee = await this.findEmployeeWithDepartmentOrThrow(employeeId);
      const category = await this.findAllowedCategoryOrThrow(dto.category_id, employee);

      // Create ticket
      const ticket = queryRunner.manager.create(Ticket, {
        employee,
        category,
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

      const departmentManagers = await this.findDepartmentManagers(
        queryRunner.manager,
        category.departments.map((department) => department.id),
      );

      await Promise.all(
        departmentManagers.map((manager) =>
          this.createNotificationWithManager(
            queryRunner.manager,
            manager,
            'TICKET',
            `Thẻ hỗ trợ "${savedTicket.title}" đã được tạo, vui lòng kiểm tra.`,
          ),
        ),
      );

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
      .leftJoinAndSelect('ticket.category', 'category');

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category_id) {
      qb.andWhere('category.id = :category_id', { category_id: query.category_id });
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
      relations: [
        'employee',
        'employee.department',
        'employee.department.ticketCategories',
        'assignee',
        'category',
        'processes',
        'processes.actor',
        'processes.assignee',
      ],
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

    if (dto.category_id !== undefined) {
      const fullTicket = await this.ticketRepository.findOne({
        where: { id: ticketId },
        relations: ['employee', 'employee.department', 'employee.department.ticketCategories'],
      });

      if (!fullTicket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      ticket.category = await this.findAllowedCategoryOrThrow(dto.category_id, fullTicket.employee);
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
        relations: ['assignee', 'employee'],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

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
      await this.createNotificationWithManager(
        queryRunner.manager,
        ticket.employee,
        'TICKET',
        `Ticket "${savedTicket.title}" was assigned to ${assignee.firstName} ${assignee.lastName}.`,
      );
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
   * Get tickets belonging to manager's department
   */
  async getDepartmentTicketsForManager(managerId: string, query: QueryTicketDto) {
    const manager = await this.findManagerWithDepartmentOrThrow(managerId);

    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'DESC';

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'employee_department')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('assignee.department', 'assignee_department')
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.processes', 'processes')
      .leftJoinAndSelect('processes.actor', 'process_actor')
      .leftJoinAndSelect('processes.assignee', 'process_assignee')
      .where('employee_department.id = :departmentId', {
        departmentId: manager.department.id,
      });

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category_id) {
      qb.andWhere('category.id = :category_id', { category_id: query.category_id });
    }

    if (query.employee_id) {
      qb.andWhere('employee.id = :employee_id', { employee_id: query.employee_id });
    }

    if (query.assignee_id) {
      qb.andWhere('assignee.id = :assignee_id', { assignee_id: query.assignee_id });
    }

    if (query.keyword) {
      qb.andWhere('(ticket.title LIKE :keyword OR ticket.description LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
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
   * Manager assigns ticket in their department to an employee in the same department
   */
  async assignTicketWithinManagerDepartment(
    managerId: string,
    ticketId: string,
    dto: AssignTicketDto,
  ): Promise<Ticket> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = await this.findManagerWithDepartmentOrThrow(managerId);

      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
        relations: ['employee', 'employee.department', 'assignee'],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      if (!ticket.employee?.department) {
        throw new BadRequestException('Ticket creator does not belong to any department');
      }

      if (ticket.employee.department.id !== manager.department.id) {
        throw new ForbiddenException('You can only assign tickets in your department');
      }

      const assignee = await queryRunner.manager.findOne(Employee, {
        where: { id: dto.assignee_id },
        relations: ['department'],
      });

      if (!assignee) {
        throw new NotFoundException(`Employee with ID ${dto.assignee_id} not found`);
      }

      if (!assignee.department) {
        throw new BadRequestException('Assignee is not assigned to any department');
      }

      if (assignee.department.id !== manager.department.id) {
        throw new ForbiddenException('You can only assign tickets to employees in your department');
      }

      ticket.assignee = assignee;
      ticket.updated_at = new Date();

      const savedTicket = await queryRunner.manager.save(ticket);

      const process = queryRunner.manager.create(TicketProcess, {
        ticket: savedTicket,
        actor: manager,
        assignee,
        type: TICKET_PROCESS_TYPE.ASSIGNED,
        note: dto.note,
        created_at: new Date(),
      });

      await queryRunner.manager.save(process);
      await this.createNotificationWithManager(
        queryRunner.manager,
        ticket.employee,
        'TICKET',
        `Ticket "${savedTicket.title}" was assigned to ${assignee.firstName} ${assignee.lastName}.`,
      );
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
        relations: ['employee'],
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
      await this.createNotificationWithManager(
        queryRunner.manager,
        ticket.employee,
        'TICKET',
        `Ticket "${savedTicket.title}" status changed from ${fromStatus} to ${dto.status}.`,
      );
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
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['assignee'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    if (!ticket.assignee) {
      throw new ForbiddenException('Ticket is not assigned yet, cannot add process');
    }

    if (ticket.assignee.id !== actorId) {
      throw new ForbiddenException('Only the assigned employee can add a ticket process');
    }

    const actor = await this.findEmployeeOrThrow(actorId);

    const process = this.ticketProcessRepository.create({
      ticket,
      actor,
      type: TICKET_PROCESS_TYPE.COMMENT,
      note: dto.note.trim(),
      created_at: new Date(),
    });

    const savedProcess = await this.ticketProcessRepository.save(process);

    if (ticket.employee && ticket.employee.id !== actorId) {
      await this.createNotification(
        ticket.employee,
        'TICKET',
        `A new update was added to ticket "${ticket.title}" by ${actor.firstName} ${actor.lastName}.`,
      );
    }

    const hydratedProcess = await this.ticketProcessRepository.findOne({
      where: { id: savedProcess.id },
      relations: ['actor', 'assignee'],
    });

    if (!hydratedProcess) {
      throw new NotFoundException(`Ticket process with ID ${savedProcess.id} not found`);
    }

    return hydratedProcess;
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
      .leftJoin('ticket.category', 'category')
      .select('category.name', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.name')
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

  private async findEmployeeWithDepartmentOrThrow(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['department', 'department.ticketCategories'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (!employee.department) {
      throw new BadRequestException('Employee is not assigned to any department1');
    }

    return employee;
  }

  private async findManagerWithDepartmentOrThrow(employeeId: string): Promise<Employee> {
    const employee = await this.findEmployeeWithDepartmentOrThrow(employeeId);

    if (employee.roles !== ROLE.MANAGER) {
      throw new ForbiddenException('Only manager can perform this action');
    }

    return employee;
  }

  private async findAllowedCategoryOrThrow(
    categoryId: string,
    employee: Employee,
  ): Promise<TicketCategory> {
    if (!employee.department) {
      throw new BadRequestException('Employee is not assigned to any department');
    }

    const category = await this.ticketCategoryRepository.findOne({
      where: { id: categoryId, is_active: true },
      relations: ['departments'],
    });

    if (!category) {
      throw new NotFoundException(`Ticket category with ID ${categoryId} not found`);
    }

    const isAllowed = category.departments.some(
      (department) => department.id === employee.department.id,
    );

    if (!isAllowed) {
      throw new ForbiddenException('Your department cannot use this ticket category');
    }

    return category;
  }

  private async createNotification(employee: Employee, type: string, message: string): Promise<void> {
    if (!employee?.id) {
      return;
    }

    const notification = this.notificationRepository.create({
      employee,
      message,
      type,
      status: 'UNREAD',
      created_at: new Date(),
    });

    await this.notificationRepository.save(notification);
  }

  private async createNotificationWithManager(
    manager: EntityManager,
    employee: Employee,
    type: string,
    message: string,
  ): Promise<void> {
    if (!employee?.id) {
      return;
    }

    const notification = manager.create(Notification, {
      employee,
      message,
      type,
      status: 'UNREAD',
      created_at: new Date(),
    });

    await manager.save(notification);
  }

  private async findDepartmentManagers(
    manager: EntityManager,
    departmentIds: string[],
  ): Promise<Employee[]> {
    if (!departmentIds.length) {
      return [];
    }

    return manager
      .getRepository(Employee)
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('department.id IN (:...departmentIds)', { departmentIds })
      .andWhere('employee.roles = :role', { role: ROLE.MANAGER })
      .getMany();
  }

  async createTicketCategory(dto: CreateTicketCategoryDto): Promise<TicketCategory> {
    const normalizedName = dto.name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this.ticketCategoryRepository.findOne({
      where: { name: normalizedName },
    });

    if (existing) {
      throw new BadRequestException('Ticket category name already exists');
    }

    const category = this.ticketCategoryRepository.create({
      name: normalizedName,
      description: dto.description?.trim() || null,
      is_active: true,
    });

    return this.ticketCategoryRepository.save(category);
  }

  async getTicketCategories(query: QueryTicketCategoryDto) {
    const qb = this.ticketCategoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.departments', 'department')
      .where('category.is_active = :isActive', { isActive: true })
      .orderBy('category.name', 'ASC');

    if (query.department_id) {
      qb.andWhere('department.id = :department_id', {
        department_id: query.department_id,
      });
    }

    return qb.getMany();
  }

  async getAllTicketCategories(): Promise<TicketCategory[]> {
    return this.ticketCategoryRepository.find({
      relations: ['departments'],
      order: { name: 'ASC' },
    });
  }

  async assignTicketCategoriesToDepartment(
    departmentId: string,
    dto: AssignDepartmentTicketCategoriesDto,
  ): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: ['ticketCategories'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    const categories = await this.ticketCategoryRepository.find({
      where: {
        id: In(dto.category_ids),
        is_active: true,
      },
    });

    if (categories.length !== dto.category_ids.length) {
      throw new BadRequestException('One or more category IDs are invalid or inactive');
    }

    department.ticketCategories = categories;
    return this.departmentRepository.save(department);
  }
}

