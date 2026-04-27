import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import {
  AssignAssetDto,
  CreateAssetDto,
  QueryAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
  UpdateAssetConditionDto,
  UpdateAssetDto,
  UpdateAssetLocationDto,
} from '../dto';
import { AssetAssignment } from '../entity/asset-assignment.entity';
import { Asset } from '../entity/asset.entity';
import { ASSET_TYPE } from '../entity/constants';
import { Employee } from '../../auth/entity/employee.entity';

@Injectable()
export class AssetService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetAssignment)
    private readonly assetAssignmentRepository: Repository<AssetAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async createAsset(dto: CreateAssetDto): Promise<Asset> {
    const type = dto.type;
    const location = this.normalizeOptionalString(dto.location);

    let owner: Employee | null = null;
    if (dto.ownerEmployeeId) {
      owner = await this.findEmployeeOrThrow(dto.ownerEmployeeId);
    }

    this.validateTypeRules(type, owner?.id ?? null, location);

    const asset = this.assetRepository.create({
      name: dto.name.trim(),
      assetTag: dto.assetTag.trim(),
      serialNumber: dto.serialNumber.trim(),
      type,
      owner,
      location,
      condition: dto.condition,
      purchase_date: new Date(dto.purchase_date),
      warranty_expiration_date: new Date(dto.warranty_expiration_date),
      maintenance_schedule: new Date(dto.maintenance_schedule),
    });

    return this.assetRepository.save(asset);
  }

  async getAssets(query: QueryAssetDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const qb = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.owner', 'owner');

    if (query.type) {
      qb.andWhere('asset.type = :type', { type: query.type });
    }

    if (query.condition) {
      qb.andWhere('asset.condition = :condition', { condition: query.condition });
    }

    if (query.ownerEmployeeId) {
      qb.andWhere('owner.id = :ownerEmployeeId', { ownerEmployeeId: query.ownerEmployeeId });
    }

    if (query.location) {
      qb.andWhere('asset.location LIKE :location', { location: `%${query.location}%` });
    }

    if (query.assetTag) {
      qb.andWhere('asset.assetTag LIKE :assetTag', { assetTag: `%${query.assetTag}%` });
    }

    if (query.serialNumber) {
      qb.andWhere('asset.serialNumber LIKE :serialNumber', { serialNumber: `%${query.serialNumber}%` });
    }

    if (query.keyword) {
      qb.andWhere(
        '(asset.name LIKE :keyword OR asset.assetTag LIKE :keyword OR asset.serialNumber LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    qb.orderBy('asset.purchase_date', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getAssetById(assetId: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      relations: ['owner'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    return asset;
  }

  async updateAsset(assetId: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.getAssetById(assetId);

    const nextType = dto.type ?? asset.type;
    const nextLocationInput = dto.location !== undefined ? dto.location : asset.location;
    const nextLocation = this.normalizeOptionalString(nextLocationInput);

    let nextOwnerId: string | null = asset.owner?.id ?? null;
    if (dto.ownerEmployeeId !== undefined) {
      nextOwnerId = dto.ownerEmployeeId ?? null;
    }

    let nextOwner: Employee | null = null;
    if (nextOwnerId) {
      nextOwner = await this.findEmployeeOrThrow(nextOwnerId);
    }

    this.validateTypeRules(nextType, nextOwnerId, nextLocation);

    if (dto.name !== undefined) {
      asset.name = dto.name.trim();
    }

    if (dto.assetTag !== undefined) {
      asset.assetTag = this.normalizeOptionalString(dto.assetTag);
    }

    if (dto.serialNumber !== undefined) {
      asset.serialNumber = this.normalizeOptionalString(dto.serialNumber);
    }

    asset.type = nextType;
    asset.owner = nextOwner;
    asset.location = nextLocation;

    if (dto.condition !== undefined) {
      asset.condition = dto.condition;
    }

    if (dto.purchase_date !== undefined) {
      asset.purchase_date = new Date(dto.purchase_date);
    }

    if (dto.warranty_expiration_date !== undefined) {
      asset.warranty_expiration_date = new Date(dto.warranty_expiration_date);
    }

    if (dto.maintenance_schedule !== undefined) {
      asset.maintenance_schedule = new Date(dto.maintenance_schedule);
    }

    return this.assetRepository.save(asset);
  }

  async updateAssetCondition(assetId: string, dto: UpdateAssetConditionDto): Promise<Asset> {
    const asset = await this.getAssetById(assetId);
    asset.condition = dto.condition;
    return this.assetRepository.save(asset);
  }

  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.getAssetById(assetId);
    await this.assetRepository.remove(asset);
  }

  async assignPrivateAsset(assetId: string, dto: AssignAssetDto) {
    const asset = await this.getAssetById(assetId);
    this.ensurePrivateAsset(asset);

    const assignee = await this.findEmployeeOrThrow(dto.employeeId);
    const assignmentDate = dto.assignmentDate ? new Date(dto.assignmentDate) : new Date();

    const activeAssignment = await this.assetAssignmentRepository.findOne({
      where: {
        asset: { id: asset.id },
        return_date: IsNull(),
      },
      relations: ['employee'],
    });

    if (activeAssignment && activeAssignment.employee?.id === assignee.id) {
      throw new BadRequestException('Asset is already assigned to this employee');
    }

    if (activeAssignment) {
      activeAssignment.return_date = assignmentDate;
      await this.assetAssignmentRepository.save(activeAssignment);
    }

    const assignment = this.assetAssignmentRepository.create({
      asset,
      employee: assignee,
      assignment_date: assignmentDate,
      return_date: null,
    });

    asset.owner = assignee;

    await this.assetRepository.save(asset);
    const savedAssignment = await this.assetAssignmentRepository.save(assignment);

    return {
      asset,
      assignment: savedAssignment,
    };
  }

  async returnPrivateAsset(assetId: string, dto: ReturnAssetDto) {
    const asset = await this.getAssetById(assetId);
    this.ensurePrivateAsset(asset);

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

    const activeAssignment = await this.assetAssignmentRepository.findOne({
      where: {
        asset: { id: asset.id },
        return_date: IsNull(),
      },
      relations: ['employee'],
    });

    if (!activeAssignment) {
      throw new NotFoundException('No active assignment found for this asset');
    }

    if (returnDate < activeAssignment.assignment_date) {
      throw new BadRequestException('returnDate cannot be earlier than assignment_date');
    }

    activeAssignment.return_date = returnDate;
    await this.assetAssignmentRepository.save(activeAssignment);

    asset.owner = null;
    await this.assetRepository.save(asset);

    return {
      asset,
      assignment: activeAssignment,
    };
  }

  async transferPrivateAsset(assetId: string, dto: TransferAssetDto) {
    const asset = await this.getAssetById(assetId);
    this.ensurePrivateAsset(asset);

    const toEmployee = await this.findEmployeeOrThrow(dto.toEmployeeId);
    const transferDate = dto.transferDate ? new Date(dto.transferDate) : new Date();

    const activeAssignment = await this.assetAssignmentRepository.findOne({
      where: {
        asset: { id: asset.id },
        return_date: IsNull(),
      },
      relations: ['employee'],
    });

    if (!activeAssignment) {
      throw new NotFoundException('No active assignment found for this asset');
    }

    if (activeAssignment.employee?.id === toEmployee.id) {
      throw new BadRequestException('Asset is already assigned to this employee');
    }

    if (transferDate < activeAssignment.assignment_date) {
      throw new BadRequestException('transferDate cannot be earlier than assignment_date');
    }

    activeAssignment.return_date = transferDate;
    await this.assetAssignmentRepository.save(activeAssignment);

    const newAssignment = this.assetAssignmentRepository.create({
      asset,
      employee: toEmployee,
      assignment_date: transferDate,
      return_date: null,
    });

    asset.owner = toEmployee;

    await this.assetRepository.save(asset);
    const savedAssignment = await this.assetAssignmentRepository.save(newAssignment);

    return {
      asset,
      previousAssignment: activeAssignment,
      assignment: savedAssignment,
    };
  }

  async getAssetAssignments(assetId: string): Promise<AssetAssignment[]> {
    await this.getAssetById(assetId);

    return this.assetAssignmentRepository.find({
      where: { asset: { id: assetId } },
      relations: ['employee'],
      order: { assignment_date: 'DESC' },
    });
  }

  async updatePublicAssetLocation(assetId: string, dto: UpdateAssetLocationDto): Promise<Asset> {
    const asset = await this.getAssetById(assetId);

    if (asset.type !== ASSET_TYPE.PUBLIC) {
      throw new BadRequestException('Only PUBLIC asset supports location update endpoint');
    }

    asset.location = dto.location.trim();
    return this.assetRepository.save(asset);
  }

  async getPublicAssetsByLocation(location: string, condition?: string): Promise<Asset[]> {
    const qb = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.owner', 'owner')
      .where('asset.type = :type', { type: ASSET_TYPE.PUBLIC })
      .andWhere('asset.location LIKE :location', { location: `%${location}%` })
      .orderBy('asset.name', 'ASC');

    if (condition) {
      qb.andWhere('asset.condition = :condition', { condition });
    }

    return qb.getMany();
  }

  async getAssetSummaryStats() {
    const total = await this.assetRepository.count();

    const typeRows = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.type', 'type')
      .addSelect('COUNT(asset.id)', 'count')
      .groupBy('asset.type')
      .getRawMany<{ type: string; count: string }>();

    const conditionRows = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.condition', 'condition')
      .addSelect('COUNT(asset.id)', 'count')
      .groupBy('asset.condition')
      .getRawMany<{ condition: string; count: string }>();

    const now = new Date();

    const warrantyExpired = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.warranty_expiration_date < :now', { now })
      .getCount();

    const maintenanceDue = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.maintenance_schedule <= :now', { now })
      .getCount();

    return {
      total,
      byType: this.toCountMap(typeRows, 'type'),
      byCondition: this.toCountMap(conditionRows, 'condition'),
      warrantyExpired,
      maintenanceDue,
    };
  }

  async getMaintenanceDueAssets(page = 1, pageSize = 20) {
    const safePage = page > 0 ? page : 1;
    const safePageSize = pageSize > 0 ? pageSize : 20;
    const now = new Date();

    const [items, total] = await this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.owner', 'owner')
      .where('asset.maintenance_schedule <= :now', { now })
      .orderBy('asset.maintenance_schedule', 'ASC')
      .skip((safePage - 1) * safePageSize)
      .take(safePageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  private async findEmployeeOrThrow(employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }
    return employee;
  }

  private normalizeOptionalString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private validateTypeRules(type: ASSET_TYPE, ownerEmployeeId: string | null, location: string | null): void {
    if (type === ASSET_TYPE.PRIVATE) {
      if (location) {
        throw new BadRequestException('PRIVATE asset must not include location');
      }
      return;
    }

    if (type === ASSET_TYPE.PUBLIC) {
      if (!location) {
        throw new BadRequestException('PUBLIC asset requires location');
      }
      if (ownerEmployeeId) {
        throw new BadRequestException('PUBLIC asset must not have ownerEmployeeId');
      }
      return;
    }

    throw new BadRequestException('Unsupported asset type');
  }

  private ensurePrivateAsset(asset: Asset): void {
    if (asset.type !== ASSET_TYPE.PRIVATE) {
      throw new BadRequestException('This endpoint is only for PRIVATE assets');
    }
  }

  private toCountMap(rows: Array<Record<string, string>>, key: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row[key]] = Number(row.count || 0);
    }
    return result;
  }
}
