import { Body, Controller, ParseFilePipeBuilder, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';

import { ChangePasswordRequestDto } from '../dto/change-password.dto';
import { LoginRequestDto, LoginResponseDto, RefreshTokenRequestDto } from '../dto/login.dto';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import { EmployeeService } from '../service/employee.service';
import { ResponseBuilder } from '../../lib/dto/response-builder.dto';


@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Post('login')
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully logged in.',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginRequestDto: LoginRequestDto) {
    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Login successful',
      data: await this.authService.login(loginRequestDto.email, loginRequestDto.password),
    });
  }

  @Post('signup')
  @ApiBody({ type: SignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created and logged in.',
    type: SignupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async signup(@Body() signupDto: SignupRequestDto) {
    // create user
    const user = await this.authService.signup(signupDto);

    // login immediately to return tokens
    const tokens = await this.authService.login(signupDto.email, signupDto.password);

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'User created and logged in',
      data: { user, tokens },
    });
  }

  @Post('refresh')
  @ApiBody({ type: RefreshTokenRequestDto })
  async refreshToken(@Body() body: RefreshTokenRequestDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current user and revoke existing tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req: any) {
    const data = await this.authService.logout(req.user.userId);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Logged out successfully',
      data,
    });
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Request() req: any, @Body() body: ChangePasswordRequestDto) {
    const data = await this.authService.changePassword(req.user.userId, body.newPassword);

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Password changed successfully',
      data,
    });
  }

  @Post('avatar/upload')
  @ApiOperation({ summary: 'Upload avatar via backend (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp|gif)$/i })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: 400,
        }),
    )
    file: Express.Multer.File,
  ) {
    const employeeId = req.user.userId;
    const data = await this.employeeService.uploadAvatar(employeeId, file);

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Avatar uploaded successfully',
      data,
    });
  }

}
