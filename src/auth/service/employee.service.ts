import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupRequestDto } from '../dto/signup.dto';
import { Employee } from '../entity/employee.entity';
import { Degree } from '../entity/degree.entity';
import { DepartmentService } from './department.service';
import { AdminCreateEmployeeDto, AdminUpdateEmployeeDto, UpdateProfileDto, DegreeInputDto } from '../dto/employee.dto';
import { GcsService } from '../../management/service/gcs.service';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Degree)
    private readonly degreeRepository: Repository<Degree>,
    private readonly departmentService: DepartmentService,
    private readonly gcsService: GcsService,
  ) {}
  async findOneById(id: string): Promise<Employee> {
    const result = await this.employeeRepository.findOne({ where: { id }, relations: ['department', 'degrees'] });
    if (!result)
      throw new UnauthorizedException('Invalid credentials');
    return result;
  }
  async findOneByEmail(email: string): Promise<Employee> {
    const result = await this.employeeRepository.findOne({ where: { email }, relations: ['department', 'degrees'] });
    if (!result)
      throw new UnauthorizedException('Invalid credentials');
    return result;
  }
  async findAll(): Promise<Employee[]> {
    return await this.employeeRepository.find({ relations: ['department', 'degrees'] });
  }

  async findAllWithQuery(options: {
    page?: number;
    pageSize?: number;
    role?: string;
    department?: string;
    search?: string;
  }): Promise<{ data: Employee[]; total: number; page: number; pageSize: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 20;

    const qb = this.employeeRepository.createQueryBuilder('employee').leftJoinAndSelect('employee.department', 'department');

    if (options.role) {
      qb.andWhere('employee.roles = :role', { role: options.role });
    }

    if (options.department) {
      qb.andWhere('department.name = :dept', { dept: options.department });
    }

    if (options.search) {
      const s = `%${options.search}%`;
      qb.andWhere('(employee.firstName LIKE :s OR employee.lastName LIKE :s OR employee.email LIKE :s)', { s });
    }

    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    return { data, total, page, pageSize };
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
    
    const { degrees, ...rest } = employee;
    Object.assign(existingEmployee, rest);
    const saved = await this.employeeRepository.save(existingEmployee);
    if (degrees && degrees.length > 0) {
      await this.updateDegrees(saved, degrees);
    }
    return await this.findOneByEmail(email);
  }

  async updateByAdmin(id: string, dto: AdminUpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findById(id);

    if (dto.email && dto.email !== employee.email) {
      if (await this.checkEmail(dto.email)) {
        throw new UnauthorizedException('Email already in use');
      }
    }

    if (dto.departmentName) {
      const department = await this.departmentService.findByName(dto.departmentName);
      employee.department = department;
    }

    const { departmentName, degrees, ...rest } = dto;
    Object.assign(employee, rest);

    const saved = await this.employeeRepository.save(employee);
    if (degrees && degrees.length > 0) {
      await this.updateDegrees(saved, degrees);
    }
    return await this.findById(id);
  }

  async createByAdmin(dto: AdminCreateEmployeeDto): Promise<Employee> {
    if (await this.checkEmail(dto.email)) {
      throw new UnauthorizedException('Email already in use');
    }

    let department;
    if (dto.departmentName) {
      department = await this.departmentService.findByName(dto.departmentName);
    }

    const { password, departmentName, degrees, ...rest } = dto;

    const employee = this.employeeRepository.create({
      ...rest,
      password_hash: await bcrypt.hash(password, 10),
      department,
    });

    const saved = await this.employeeRepository.save(employee);
    if (degrees && degrees.length > 0) {
      await this.updateDegrees(saved, degrees);
    }

    return await this.findById(saved.id);
  }
  async updateDepartment(email: string, departmentName: string): Promise<Employee> {
    const employee = await this.findOneByEmail(email);
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
  async findById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id }, relations: ['department', 'degrees'] });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async softDeleteById(id: string): Promise<void> {
    const employee = await this.findById(id);
    await this.employeeRepository.softRemove(employee);
  }

  private async updateDegrees(employee: Employee, degrees: DegreeInputDto[]): Promise<void> {
    if (!degrees || degrees.length === 0) {
      return;
    }
    // Remove all existing degrees
    await this.degreeRepository.delete({ employee: { id: employee.id } });
    // Create new degrees
    const newDegrees = degrees.map(deg => this.degreeRepository.create({ ...deg, employee }));
    await this.degreeRepository.save(newDegrees);
  }

  async uploadAvatar(employeeId: string, file: Express.Multer.File) {
    const employee = await this.findById(employeeId);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    const safeFileName = file.originalname.replace(/\s+/g, '-');
    const key = `employees/${employee.id}/avatar/${Date.now()}-${safeFileName}`;

    const uploaded = await this.gcsService.uploadFile({
      key,
      file: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });

    employee.avatarKey = uploaded.key;
    employee.avatarUrl = uploaded.fileUrl;
    await this.employeeRepository.save(employee);

    return {
      employeeId: employee.id,
      key: uploaded.key,
      fileUrl: uploaded.fileUrl,
    };
  }

}