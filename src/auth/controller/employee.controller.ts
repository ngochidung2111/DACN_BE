import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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
  @Roles('admin')
  @Get('admin')
  @ApiResponse({ status: 200, description: 'The admin profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getAdminProfile(@Request() req) {
    return req.user;
  }
}
