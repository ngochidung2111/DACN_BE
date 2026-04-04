import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';


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
import { ASSET_CONDITION, ROLE } from '../entity/constants';
import { AssetService } from '../service/asset.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('Assets')
@Controller('assets')
@ApiBearerAuth()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @ApiOperation({ summary: 'Create asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post()
  async createAsset(@Body() body: CreateAssetDto) {
    const asset = await this.assetService.createAsset(body);
    return {
      success: true,
      message: 'Asset created successfully',
      data: asset,
    };
  }

  @ApiOperation({ summary: 'Get assets with filters and paging' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: ['PUBLIC', 'PRIVATE'] })
  @ApiQuery({ name: 'condition', required: false, enum: Object.values(ASSET_CONDITION) })
  @ApiQuery({ name: 'ownerEmployeeId', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiResponse({ status: 200, description: 'Asset list' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  async getAssets(@Query() query: QueryAssetDto) {
    const result = await this.assetService.getAssets(query);
    return {
      success: true,
      data: result,
    };
  }

  @ApiOperation({ summary: 'Get PUBLIC assets by location' })
  @ApiQuery({ name: 'location', required: true, example: 'Building A' })
  @ApiQuery({ name: 'condition', required: false, enum: Object.values(ASSET_CONDITION) })
  @ApiResponse({ status: 200, description: 'Public assets by location' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('public/by-location')
  async getPublicAssetsByLocation(
    @Query('location') location: string,
    @Query('condition') condition?: ASSET_CONDITION,
  ) {
    const assets = await this.assetService.getPublicAssetsByLocation(location, condition);
    return {
      success: true,
      data: assets,
      total: assets.length,
    };
  }

  @ApiOperation({ summary: 'Get asset summary statistics' })
  @ApiResponse({ status: 200, description: 'Asset summary stats' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('stats/summary')
  async getAssetSummaryStats() {
    const stats = await this.assetService.getAssetSummaryStats();
    return {
      success: true,
      data: stats,
    };
  }

  @ApiOperation({ summary: 'Get maintenance due assets' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Maintenance due assets' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('maintenance/due')
  async getMaintenanceDueAssets(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const result = await this.assetService.getMaintenanceDueAssets(page, pageSize);
    return {
      success: true,
      data: result,
    };
  }

  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  async getAssetById(@Param('id') assetId: string) {
    const asset = await this.assetService.getAssetById(assetId);
    return {
      success: true,
      data: asset,
    };
  }

  @ApiOperation({ summary: 'Update asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id')
  async updateAsset(@Param('id') assetId: string, @Body() body: UpdateAssetDto) {
    const asset = await this.assetService.updateAsset(assetId, body);
    return {
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    };
  }

  @ApiOperation({ summary: 'Update asset condition' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: UpdateAssetConditionDto })
  @ApiResponse({ status: 200, description: 'Asset condition updated successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id/condition')
  async updateAssetCondition(
    @Param('id') assetId: string,
    @Body() body: UpdateAssetConditionDto,
  ) {
    const asset = await this.assetService.updateAssetCondition(assetId, body);
    return {
      success: true,
      message: 'Asset condition updated successfully',
      data: asset,
    };
  }

  @ApiOperation({ summary: 'Assign PRIVATE asset to employee' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: AssignAssetDto })
  @ApiResponse({ status: 200, description: 'Asset assigned successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post(':id/assign')
  async assignPrivateAsset(@Param('id') assetId: string, @Body() body: AssignAssetDto) {
    const data = await this.assetService.assignPrivateAsset(assetId, body);
    return {
      success: true,
      message: 'Asset assigned successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Return PRIVATE asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: ReturnAssetDto })
  @ApiResponse({ status: 200, description: 'Asset returned successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post(':id/return')
  async returnPrivateAsset(@Param('id') assetId: string, @Body() body: ReturnAssetDto) {
    const data = await this.assetService.returnPrivateAsset(assetId, body);
    return {
      success: true,
      message: 'Asset returned successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Transfer PRIVATE asset to another employee' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: TransferAssetDto })
  @ApiResponse({ status: 200, description: 'Asset transferred successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Post(':id/transfer')
  async transferPrivateAsset(@Param('id') assetId: string, @Body() body: TransferAssetDto) {
    const data = await this.assetService.transferPrivateAsset(assetId, body);
    return {
      success: true,
      message: 'Asset transferred successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Get assignment history of an asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset assignments retrieved successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/assignments')
  async getAssetAssignments(@Param('id') assetId: string) {
    const assignments = await this.assetService.getAssetAssignments(assetId);
    return {
      success: true,
      data: assignments,
      total: assignments.length,
    };
  }

  @ApiOperation({ summary: 'Update location for PUBLIC asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: UpdateAssetLocationDto })
  @ApiResponse({ status: 200, description: 'Asset location updated successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Patch(':id/location')
  async updatePublicAssetLocation(
    @Param('id') assetId: string,
    @Body() body: UpdateAssetLocationDto,
  ) {
    const asset = await this.assetService.updatePublicAssetLocation(assetId, body);
    return {
      success: true,
      message: 'Asset location updated successfully',
      data: asset,
    };
  }

  @ApiOperation({ summary: 'Delete asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN)
  @Delete(':id')
  async deleteAsset(@Param('id') assetId: string) {
    await this.assetService.deleteAsset(assetId);
    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  }
}
