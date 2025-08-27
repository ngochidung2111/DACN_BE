import { ROLE } from 'src/management/entity/constants';

import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@ApiTags('employee')
@ApiBearerAuth()
@Controller('employee')
export class EmployeeController {
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiResponse({ status: 200, description: 'The user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLE.ADMIN, ROLE.MANAGER)
  @Get('admin')
  @ApiResponse({ status: 200, description: 'The admin profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminProfile(@Request() req) {
    return req.user;
  }
}
