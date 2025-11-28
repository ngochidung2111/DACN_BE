import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupRequestDto } from '../dto/signup.dto';
import { Employee } from '../entity/employee.entity';
import { DepartmentService } from './department.service';
import { UpdateProfileDto } from '../dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly departmentService: DepartmentService,
  ) {}
  async findOneById(id: string): Promise<Employee | null> {
    const result = await this.employeeRepository.findOne({ where: { id } });
    if (!result)
      throw new UnauthorizedException('Invalid credentials');
    return result;
  }
  async findOneByEmail(email: string): Promise<Employee | null> {
    const result = await this.employeeRepository.findOne({ where: { email } , relations: ['department'] });
    if (!result)
      throw new UnauthorizedException('Invalid credentials');
    return result;
  }
  async findAll(): Promise<Employee[]> {
    return await this.employeeRepository.find({ relations: ['department'] });
  }
  async create(employeeData: SignupRequestDto): Promise<Employee> {
    let department;
    if (employeeData.department) {
      const department = await this.departmentService.findByName(employeeData.department);
    }
    if (await this.checkEmail(employeeData.email)) {
      throw new UnauthorizedException('Email already in use');
    }
    const employee = this.employeeRepository.create({
      ...employeeData,
      password_hash: await bcrypt.hash(employeeData.password, 10),
      department: department,
    });
    return await this.employeeRepository.save(employee);
  }
  async update(email: string, employee: UpdateProfileDto): Promise<Employee> {
    const existingEmployee = await this.findOneByEmail(email);
    
    if (!existingEmployee) {
      throw new UnauthorizedException('Employee not found');
    }
    Object.assign(existingEmployee, employee);
    return await this.employeeRepository.save(existingEmployee);
  }
  async updateDepartment(email: string, departmentName: string): Promise<Employee> {
    const employee = await this.findOneByEmail(email);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }
    const department = await this.departmentService.findByName(departmentName);
    employee.department = department;
    return await this.employeeRepository.save(employee);
  }
  async checkEmail(email: string): Promise<boolean> {
    const employee = await this.employeeRepository.findOne({ where: { email } });
    return !!employee;
  }
  async findByDepartment(departmentName: string): Promise<Employee[]> {
    const department = await this.departmentService.findByName(departmentName);
    if (!department) {
      throw new NotFoundException ('Department not found');
    }
    return await this.employeeRepository.find({ where: { department: { id: department.id } }, relations: ['department'] });
  }
}