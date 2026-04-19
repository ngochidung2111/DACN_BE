import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DepartmentService } from "../service/department.service";
import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { CreateDepartmentDto, DepartmentDto } from "../dto/department.dto";
import { LoginResponseDto } from "../dto/login.dto";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../roles.decorator";

import { RolesGuard } from "../roles.guard";

import { plainToInstance } from "class-transformer";
import { ResponseBuilder } from "../../lib/dto/response-builder.dto";
import { ROLE } from "../../management/entity/constants";
import { Cache } from 'cache-manager';

@ApiTags('department')
@ApiBearerAuth()
@Controller('department')
export class DepartmentController {
    private readonly cacheVersionKey = 'department:cache:version';
    private readonly cacheTtl = 60_000;

    constructor(
        private readonly departmentService: DepartmentService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @ApiResponse({
        status: 200,
        description: 'List of all departments.',
        type: [DepartmentDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.'
    })
    async getAllDepartments() {
        return this.getOrSetCache('all', 'all', async () =>
            ResponseBuilder.createResponse({
                statusCode: 200,
                message: 'Departments retrieved successfully',
                data: plainToInstance(DepartmentDto, await this.departmentService.findAll(), { excludeExtraneousValues: true }),
            }),
        );
    }

    @Post('create')
    @UseGuards(AuthGuard('jwt') , RolesGuard)
    @Roles(ROLE.ADMIN)
    @ApiBody({ type: CreateDepartmentDto })
    @ApiResponse({
        status: 201,
        description: 'The user has been successfully logged in.',
        type: DepartmentDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async createDepartment(@Req() req, @Body() createDepartmentDto: CreateDepartmentDto) {
        const created = await this.departmentService.create(createDepartmentDto.name);
        await this.bumpCacheVersion();
        return created;
    }

    private async getOrSetCache<T>(scope: string, suffix: string, factory: () => Promise<T>): Promise<T> {
        const version = await this.getCacheVersion();
        const key = `department:${scope}:v${version}:${suffix}`;
        const cached = await this.cacheManager.get<T>(key);

        if (cached !== undefined && cached !== null) {
            return cached;
        }

        const fresh = await factory();
        await this.cacheManager.set(key, fresh, this.cacheTtl);
        return fresh;
    }

    private async getCacheVersion(): Promise<number> {
        const value = await this.cacheManager.get<number>(this.cacheVersionKey);
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            return value;
        }

        await this.cacheManager.set(this.cacheVersionKey, 1);
        return 1;
    }

    private async bumpCacheVersion(): Promise<void> {
        const version = await this.getCacheVersion();
        await this.cacheManager.set(this.cacheVersionKey, version + 1);
    }
}