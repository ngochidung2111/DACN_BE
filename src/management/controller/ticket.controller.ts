import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { ROLE } from '../entity/constants';
import {
  AssignDepartmentTicketCategoriesDto,
  AssignTicketDto,
  CreateTicketDto,
  CreateTicketCategoryDto,
  CreateTicketProcessDto,
  QueryTicketCategoryDto,
  QueryTicketDto,
  TicketCategoryResponseDto,
  TicketListResponseDto,
  TicketProcessResponseDto,
  TicketResponseDto,
  TicketTimelineResponseDto,
  UpdateTicketDto,
  UpdateTicketStatusDto,
} from '../dto';
import { Ticket } from '../entity/ticket.entity';
import { TicketService } from '../service/ticket.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';

@Controller('management/tickets')
@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Create a new ticket category
   */
  @Post('categories')
  @ApiOperation({ summary: 'Create a new ticket category' })
  @ApiBody({ type: CreateTicketCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Ticket category created successfully',
    type: TicketCategoryResponseDto,
  })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  async createCategory(@Body() dto: CreateTicketCategoryDto) {
    const category = await this.ticketService.createTicketCategory(dto);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Ticket category created successfully',
      data: category,
    });
  }

  /**
   * List ticket categories
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get available ticket categories' })
  @ApiResponse({
    status: 200,
    description: 'Ticket categories retrieved successfully',
    type: [TicketCategoryResponseDto],
  })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  async getCategories(@Query() query: QueryTicketCategoryDto) {
    const categories = await this.ticketService.getTicketCategories(query);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket categories retrieved successfully',
      data: categories,
    });
  }

  /**
   * List all ticket categories
   */
  @Get('categories/all')
  @ApiOperation({ summary: 'Get all ticket categories' })
  @ApiResponse({
    status: 200,
    description: 'All ticket categories retrieved successfully',
    type: [TicketCategoryResponseDto],
  })
  async getAllCategories() {
    const categories = await this.ticketService.getAllTicketCategories();
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'All ticket categories retrieved successfully',
      data: categories,
    });
  }

  /**
   * Set ticket categories managed by a department
   */
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch('departments/:departmentId/categories')
  @ApiOperation({ summary: 'Assign ticket categories to a department' })
  @ApiBody({ type: AssignDepartmentTicketCategoriesDto })
  @ApiResponse({
    status: 200,
    description: 'Department ticket categories updated successfully',
  })
  async assignCategoriesToDepartment(
    @Param('departmentId') departmentId: string,
    @Body() dto: AssignDepartmentTicketCategoriesDto,
  ) {
    const department = await this.ticketService.assignTicketCategoriesToDepartment(
      departmentId,
      dto,
    );

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Department ticket categories updated successfully',
      data: department,
    });
  }

  /**
   * Create a new ticket
   */
  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: TicketResponseDto,
  })
  async create(@Body() dto: CreateTicketDto, @Req() req: any) {
    const employeeId = req.user.userId; // Get employee ID from JWT token
    const ticket = await this.ticketService.createTicket(dto, employeeId);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Ticket created successfully',
      data: plainToInstance(TicketResponseDto, ticket, { excludeExtraneousValues: true }),
    });
  }

  /**
   * Get list of tickets with filters
   */
  @Get()
  @ApiOperation({ summary: 'Get list of tickets with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved successfully',
    type: TicketListResponseDto,
  })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  async list(@Query() query: QueryTicketDto) {
    const result = await this.ticketService.getTickets(query);
    const data = plainToInstance(TicketListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Tickets retrieved successfully',
      data,
    });
  }

  /**
   * Get my tickets (created by current user)
   */
  @Get('me')
  @ApiOperation({ summary: 'Get tickets created by current user' })
  @ApiQuery({ type: QueryTicketDto })
  @ApiResponse({
    status: 200,
    description: 'My tickets retrieved successfully',
    type: TicketListResponseDto,
  })
  async getMyTickets(
    @Query() query: Omit<QueryTicketDto, 'employee_id'>,
    @Req() req: any,
  ) {
    // In real scenario, get employeeId from JWT token
    const employeeId = req.user.userId;
    const result = await this.ticketService.getMyTickets(employeeId, query);
    console.log(employeeId);
    
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'My tickets retrieved successfully',
      data: result,
    });
  }

  /**
   * Get tickets assigned to current user
   */
  @Get('assigned/me')
  @ApiOperation({ summary: 'Get tickets assigned to current user' })
  @ApiQuery({ type: QueryTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Assigned tickets retrieved successfully',
    type: TicketListResponseDto,
  })
  async getAssignedToMe(
    @Query() query: Omit<QueryTicketDto, 'assignee_id'>,
    @Req() req: any,
  ) {
    // In real scenario, get employeeId from JWT token
    const employeeId = req.user.userId;
    const result = await this.ticketService.getAssignedToMe(employeeId, query);
    const data = plainToInstance(TicketListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Assigned tickets retrieved successfully',
      data,
    });
  }

  /**
   * Get tickets of manager's department
   */
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('manager/department')
  @Roles(ROLE.MANAGER)
  @ApiOperation({ summary: 'Manager gets tickets belonging to their department' })
  @ApiQuery({ type: QueryTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Department tickets retrieved successfully',
    type: TicketListResponseDto,
  })
  async getDepartmentTicketsForManager(
    @Query() query: QueryTicketDto,
    @Req() req: any,
  ) {
    const managerId = req.user.userId;
    const result = await this.ticketService.getDepartmentTicketsForManager(managerId, query);
    const data = plainToInstance(TicketListResponseDto, result, {
      excludeExtraneousValues: true,
    });

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Department tickets retrieved successfully',
      data,
    });
  }

  /**
   * Assign ticket to an employee in manager's department
   */
  @Patch('manager/:id/assign')
  @Roles(ROLE.MANAGER)
  @ApiOperation({
    summary:
      'Manager assigns a department ticket to an employee in the same department',
  })
  @ApiBody({ type: AssignTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Department ticket assigned successfully',
    type: TicketResponseDto,
  })
  async assignDepartmentTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    const managerId = req.user.userId;
    const ticket = await this.ticketService.assignTicketWithinManagerDepartment(
      managerId,
      id,
      dto,
    );

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Department ticket assigned successfully',
      data: ticket,
    });
  }

  /**
   * Get ticket statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  async getStats() {
    const stats = await this.ticketService.getTicketStats();
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Statistics retrieved successfully',
      data: stats,
    });
  }

  /**
   * Get ticket by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket retrieved successfully',
    type: TicketResponseDto,
  })
  async getById(@Param('id') id: string) {
    const ticket = await this.ticketService.getTicketById(id);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket retrieved successfully',
      data: ticket,
    });
  }

  /**
   * Update ticket (title, description, category)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket details' })
  @ApiBody({ type: UpdateTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket updated successfully',
    type: TicketResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const ticket = await this.ticketService.updateTicket(id, dto);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket updated successfully',
      data: ticket,
    });
  }

  /**
   * Delete ticket
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket deleted successfully',
  })
  async delete(@Param('id') id: string) {
    await this.ticketService.deleteTicket(id);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket deleted successfully',
      data: null,
    });
  }

  /**
   * Assign ticket to an employee
   */
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to an employee' })
  @ApiBody({ type: AssignTicketDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket assigned successfully',
    type: TicketResponseDto,
  })
  async assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    const ticket = await this.ticketService.assignTicket(id, dto);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket assigned successfully',
      data: ticket,
    });
  }

  /**
   * Update ticket status
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket status updated successfully',
    type: TicketResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: any,
  ) {
    // In real scenario, get actorId from JWT token
    const actorId = req.user.userId; // Placeholder
    const ticket = await this.ticketService.updateTicketStatus(id, dto, actorId);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Ticket status updated successfully',
      data: ticket,
    });
  }

  /**
   * Add process/comment to ticket
   */
  @Post(':id/processes')
  @ApiOperation({ summary: 'Add a process/comment to ticket' })
  @ApiBody({ type: CreateTicketProcessDto })
  @ApiResponse({
    status: 201,
    description: 'Process added successfully',
    type: TicketProcessResponseDto,
  })
  async addProcess(
    @Param('id') id: string,
    @Body() dto: CreateTicketProcessDto,
    @Req() req: any,
  ) {
    // In real scenario, get actorId from JWT token
    const actorId = req.user.userId     ; // Assuming the user ID is stored in the request object

    const process = await this.ticketService.addTicketProcess(id, dto, actorId);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Process added successfully',
      data: process,
    });
  }

  /**
   * Get ticket timeline/processes
   */
  @Get(':id/processes')
  @ApiOperation({ summary: 'Get ticket timeline/process history' })
  @ApiResponse({
    status: 200,
    description: 'Timeline retrieved successfully',
    type: TicketTimelineResponseDto,
  })
  async getTimeline(@Param('id') id: string) {
    const timeline = await this.ticketService.getTicketTimeline(id);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Timeline retrieved successfully',
      data: timeline,
    });
  }
}
