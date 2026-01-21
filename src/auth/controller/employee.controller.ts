import { ROLE } from 'src/management/entity/constants';

import { Body, Controller, Get, NotFoundException, Param, Post, Request, Res, UseGuards, Query, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { EmployeeService } from '../service/employee.service';
import { QueryEmployeeDto } from '../dto/query-employee.dto';
import { EmployeeListResponseDto } from '../dto/employee-list-response.dto';

import { plainToInstance } from 'class-transformer';
import { AdminUpdateEmployeeDto, EmployeeDto, UpdateProfileDto } from '../dto/employee.dto';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';

@ApiTags('employee')
@ApiBearerAuth()
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('profile')
  @ApiResponse({ status: 200, description: 'The user profile.', type: EmployeeDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Request() req) {
    const employee = await this.employeeService.findOneByEmail(req.user.email);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: plainToInstance(EmployeeDto, employee, { excludeExtraneousValues: true }),
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('admin')
  @ApiResponse({ status: 200, description: 'The admin profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('all')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, example: 'EMPLOYEE' })
  @ApiQuery({ name: 'department', required: false, example: 'Engineering' })
  @ApiQuery({ name: 'search', required: false, example: 'john' })
  @ApiResponse({ status: 200, description: 'List of all employees.', type: EmployeeListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getallEmployees(@Query() query: QueryEmployeeDto) {
    const { data, total, page, pageSize } = await this.employeeService.findAllWithQuery(query as any);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employees retrieved successfully',
      data: {
        items: plainToInstance(EmployeeDto, data, { excludeExtraneousValues: true }),
        total,
        page,
        pageSize,
      },
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Patch('by-admin/:id')
  @ApiBody({ type: AdminUpdateEmployeeDto })
  @ApiResponse({ status: 200, description: 'Employee updated successfully.', type: EmployeeDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  async updateEmployeeByAdmin(@Param('id') id: string, @Body() body: AdminUpdateEmployeeDto) {
    const updated = await this.employeeService.updateByAdmin(id, body);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employee updated successfully',
      data: plainToInstance(EmployeeDto, updated, { excludeExtraneousValues: true }),
    });
  }

  // Employee update his/her profile
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('update')
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'The updated employee profile.', type: EmployeeDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  async updateEmployee(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const employee = await this.employeeService.findOneByEmail(req.user.email);
    if (!employee) throw new NotFoundException('Employee not found');
    
    const updatedEmployee = await this.employeeService.update(req.user.email, updateProfileDto);
    return plainToInstance(EmployeeDto, updatedEmployee, { excludeExtraneousValues: true });
  }
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(ROLE.ADMIN, ROLE.MANAGER)
  // @Get('department/:name')
  // async getEmployeesByDepartment(@Request() req, @Param('name') name: string) {
  //   const departmentName = req.params.name;
  //   const employees = await this.employeeService.findByDepartment(departmentName);
  //   return ResponseBuilder.createResponse({
  //     statusCode: 200,
  //     message: 'Employees retrieved successfully',
  //     data: plainToInstance(EmployeeDto, employees, { excludeExtraneousValues: true }),
  //   });
  // }
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('department')
  async getEmployeesByManger(@Request() req) {
    
    const employee = await this.employeeService.findOneByEmail(req.user.email);
    if (!employee || !employee.department) {
      throw new NotFoundException('Department not found for the manager');
    }
    if (employee.roles !== ROLE.MANAGER) {
      throw new NotFoundException('User is not a manager');
    }
    const departmentEmployees = await this.employeeService.findByDepartment(employee.department.name);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employees retrieved successfully',
      data: plainToInstance(EmployeeDto, departmentEmployees, { excludeExtraneousValues: true }),
    });
  }
}