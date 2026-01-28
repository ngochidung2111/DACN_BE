import { InjectRepository } from "@nestjs/typeorm";
import { Department } from "../entity/department.entity";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";


export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<Department[]> {
    
    return await this.departmentRepository.find({ relations: ['employees'] });
  }

  async findById(id: string): Promise<Department> {
    const result = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!result) {
      throw new NotFoundException({code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found'});
    }
    return result;
  }
  async findByName(name: string): Promise<Department> {
    const result = await this.departmentRepository.findOne({
      where: { name: name },
      relations: ['employees'],
    });
    if (!result) {
      throw new NotFoundException({code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found'});
    }
    return result;
  }
  async create(name: string): Promise<Department> {
    const department = this.departmentRepository.create({ name });
    return await this.departmentRepository.save(department);
  }
}