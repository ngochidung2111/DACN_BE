import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import { HolidayService } from '../service/holiday.service';
import { Holiday } from '../entity/holiday.entity';
import { CreateHolidayDto, UpdateHolidayDto, CreateHolidaysDto } from '../dto/holiday';

import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ROLE } from '../entity/constants';

@ApiTags('Holidays')
@ApiBearerAuth()
@Controller('holidays')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Create a new holiday' })
  @ApiResponse({ status: 201, description: 'Holiday created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBody({ type: CreateHolidayDto })
  async create(@Body() createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    return this.holidayService.create(createHolidayDto);
  }

  @Post('batch')
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Create multiple holidays at once' })
  @ApiResponse({ status: 201, description: 'Holidays created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiBody({ type: CreateHolidaysDto })
  async createBatch(@Body() createHolidaysDto: CreateHolidaysDto): Promise<Holiday[]> {
    return this.holidayService.createBatch(createHolidaysDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active holidays' })
  @ApiResponse({ status: 200, description: 'Holidays retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(): Promise<Holiday[]> {
    return this.holidayService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get holiday by ID' })
  @ApiParam({ name: 'id', description: 'Holiday ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Holiday retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  async findOne(@Param('id') id: string): Promise<Holiday> {
    return this.holidayService.findOne(id);
  }

  @Put(':id')
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Update a holiday' })
  @ApiParam({ name: 'id', description: 'Holiday ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Holiday updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  @ApiBody({ type: UpdateHolidayDto })
  async update(@Param('id') id: string, @Body() updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    return this.holidayService.update(id, updateHolidayDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Delete a holiday' })
  @ApiParam({ name: 'id', description: 'Holiday ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Holiday deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or HR role required' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.holidayService.remove(id);
  }

  @Get('month/:year/:month')
  @ApiOperation({ summary: 'Get holidays by month and year' })
  @ApiParam({ name: 'year', description: 'Year (e.g., 2026)' })
  @ApiParam({ name: 'month', description: 'Month (1-12)' })
  @ApiResponse({ status: 200, description: 'Holidays retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHolidaysByMonth(@Param('year') year: number, @Param('month') month: number): Promise<Holiday[]> {
    return this.holidayService.getHolidaysByMonth(year, month);
  }
}
