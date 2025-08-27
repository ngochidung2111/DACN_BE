import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupRequestDto } from '../dto/signup.dto';
import { Employee } from '../entity/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findOneByEmail(email: string): Promise<Employee | null> {
    const result = await this.employeeRepository.findOne({ where: { email } });
    if (!result)
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' });
    return result;
  }
  async create(employeeData: SignupRequestDto): Promise<Employee> {
    const employee = this.employeeRepository.create({
      ...employeeData,
      password_hash: await bcrypt.hash(employeeData.password, 10),
    });
    return await this.employeeRepository.save(employee);
  }
}
