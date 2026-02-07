import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SignupRequestDto } from '../dto/signup.dto';
import { Employee } from '../entity/employee.entity';
import { Degree } from '../entity/degree.entity';
import { DepartmentService } from './department.service';
import { AdminUpdateEmployeeDto, UpdateProfileDto, DegreeInputDto } from '../dto/employee.dto';
import { S3Service } from '../../management/service/s3.service';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Degree)
    private readonly degreeRepository: Repository<Degree>,
    private readonly departmentService: DepartmentService,
    private readonly s3Service: S3Service,
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

  async createAvatarUploadUrl(employeeId: string, fileName: string, fileType: string) {
    const employee = await this.findById(employeeId);

    if (!fileName || !fileType) {
      throw new BadRequestException('fileName and fileType are required');
    }

    const safeFileName = fileName.replace(/\s+/g, '-');
    const key = `employees/${employee.id}/avatar/${Date.now()}-${safeFileName}`;

    const { uploadUrl, fileUrl } = await this.s3Service.createUploadUrl({
      key,
      contentType: fileType,
    });

    employee.avatarKey = key;
    employee.avatarUrl = fileUrl;
    await this.employeeRepository.save(employee);
    // KHÔNG lưu vào DB ở đây - chờ frontend upload xong mới confirm
    return {
      uploadUrl,
      fileUrl,
      key,
      employeeId: employee.id,
    };
  }

  async confirmAvatarUpload(employeeId: string, key: string, fileUrl: string) {
    const employee = await this.findById(employeeId);

    if (!key || !fileUrl) {
      throw new BadRequestException('key and fileUrl are required');
    }

    // Verify key thuộc về employee này
    if (!key.startsWith(`employees/${employee.id}/avatar/`)) {
      throw new BadRequestException('Invalid avatar key for this employee');
    }

    // Lưu avatar key và URL vào database
    employee.avatarKey = key;
    employee.avatarUrl = fileUrl;
    await this.employeeRepository.save(employee);

    return {
      avatarUrl: fileUrl,
      avatarKey: key,
    };
  }
}