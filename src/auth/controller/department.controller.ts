import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DepartmentService } from "../service/department.service";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { CreateDepartmentDto, DepartmentDto } from "../dto/department.dto";
import { LoginResponseDto } from "../dto/login.dto";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../roles.decorator";
import { ResponseBuilder } from "src/lib/dto/response-builder.dto";
import { RolesGuard } from "../roles.guard";
import { ROLE } from "src/management/entity/constants";

@ApiTags('department')
@ApiBearerAuth()
@Controller('department')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

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
        return ResponseBuilder.createResponse({
            statusCode: 200,
            message: 'Departments retrieved successfully',
            data: await this.departmentService.findAll(),
        })
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
        return this.departmentService.create(createDepartmentDto.name);
    }
}