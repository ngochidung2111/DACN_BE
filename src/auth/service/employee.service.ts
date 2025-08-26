import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entity/employee.entity';

import * as bcrypt from 'bcrypt';
import { SignupRequestDto } from '../dto/signup.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findOneByEmail(email: string): Promise<Employee | null> {
    return await this.employeeRepository.findOne({ where: { email } });
  }
  async create(employeeData: SignupRequestDto): Promise<Employee> {
    const employee = this.employeeRepository.create({
      ...employeeData,
      password_hash: await bcrypt.hash(employeeData.password, 10),
    });
    return await this.employeeRepository.save(employee);
  }
}
