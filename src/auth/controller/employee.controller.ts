import { ROLE } from 'src/management/entity/constants';

import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Request, Res, UseGuards, Query, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags, ApiQuery, ApiOperation, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { EmployeeService } from '../service/employee.service';
import { QueryEmployeeDto } from '../dto/query-employee.dto';
import { EmployeeListResponseDto } from '../dto/employee-list-response.dto';

import { plainToInstance } from 'class-transformer';
import { AdminCreateEmployeeDto, AdminUpdateEmployeeDto, EmployeeDto, UpdateProfileDto } from '../dto/employee.dto';
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
  @Post('by-admin')
  @ApiBody({ type: AdminCreateEmployeeDto })
  @ApiResponse({ status: 201, description: 'Employee created successfully.', type: EmployeeDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createEmployeeByAdmin(@Body() body: AdminCreateEmployeeDto) {
    const created = await this.employeeService.createByAdmin(body);
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Employee created successfully',
      data: plainToInstance(EmployeeDto, created, { excludeExtraneousValues: true }),
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
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


  // Upload avatar
  // @ApiOperation({ summary: 'Upload avatar cho employee' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary',
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  // @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @UseInterceptors(FileInterceptor('file'))
  // @Post('avatar/upload')
  // async uploadAvatar(
  //   @Request() req,
  //   @UploadedFile() file: any,
  // ) {
  //   const employee = await this.employeeService.findOneByEmail(req.user.email);
  //   if (!employee) throw new NotFoundException('Employee not found');

  //   const data = await this.employeeService.uploadAvatar(employee.id, file);

  //   return ResponseBuilder.createResponse({
  //     statusCode: 200,
  //     message: 'Avatar uploaded successfully',
  //     data,
  //   });
  // }

  // Admin upload avatar for employee
  // @ApiOperation({ summary: 'Admin upload avatar cho employee' })
  // @ApiParam({ name: 'id', description: 'Employee ID' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary',
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  // @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // @ApiResponse({ status: 403, description: 'Forbidden.' })
  // @ApiResponse({ status: 404, description: 'Employee not found.' })
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(ROLE.ADMIN)
  // @UseInterceptors(FileInterceptor('file'))
  // @Post(':id/avatar/upload')
  // async uploadAvatarByAdmin(
  //   @Param('id') employeeId: string,
  //   @UploadedFile() file: any,
  // ) {
  //   const data = await this.employeeService.uploadAvatar(employeeId, file);

  //   return ResponseBuilder.createResponse({
  //     statusCode: 200,
  //     message: 'Avatar uploaded successfully',
  //     data,
  //   });
  // }

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
    
    const departmentEmployees = await this.employeeService.findByDepartment(employee.department.name);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employees retrieved successfully',
      data: plainToInstance(EmployeeDto, departmentEmployees, { excludeExtraneousValues: true }),
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @ApiResponse({ status: 200, description: 'The employee profile.', type: EmployeeDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getEmployeeById(@Param('id') id: string, @Request() req) {
    const user = await this.employeeService.findOneByEmail(req.user.email);
    if (user.roles === ROLE.MANAGER) {
      if (!user.department) {
        throw new NotFoundException('Department not found for the manager');
      }
      const targetEmployee = await this.employeeService.findById(id);   
      if (targetEmployee.department?.id !== user.department.id) {
        throw new NotFoundException('Employee not found in your department');
      }
    }
    const employee = await this.employeeService.findById(id);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employee retrieved successfully',
      data: plainToInstance(EmployeeDto, employee, { excludeExtraneousValues: true }),
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  async deleteEmployeeById(@Param('id') id: string) {
    await this.employeeService.softDeleteById(id);
    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Employee deleted successfully',
      data: null,
    });
  }
}