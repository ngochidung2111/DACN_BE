import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LoginRequestDto, LoginResponseDto, RefreshTokenRequestDto } from '../dto/login.dto';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';
import { AvatarUploadDto, AvatarUploadResponseDto, ConfirmAvatarUploadDto } from '../dto/avatar-upload.dto';
import { AuthService } from '../service/auth.service';
import { EmployeeService } from '../service/employee.service';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';

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

  @Post('avatar/upload-url')
  @ApiBody({ type: AvatarUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL for avatar upload generated successfully.',
    type: AvatarUploadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @UseGuards(AuthGuard('jwt'))
  async createAvatarUploadUrl(
    @Request() req: any,
    @Body() avatarUploadDto: AvatarUploadDto,
  ) {
    const employeeId = req.user.userId;
    const data = await this.employeeService.createAvatarUploadUrl(
      employeeId,
      avatarUploadDto.fileName,
      avatarUploadDto.fileType,
    );

    return ResponseBuilder.createResponse({
      statusCode: 201,
      message: 'Avatar upload URL generated successfully',
      data,
    });
  }

  @Post('avatar/confirm')
  @ApiBody({ type: ConfirmAvatarUploadDto })
  @ApiResponse({
    status: 200,
    description: 'Avatar upload confirmed and saved to profile.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @UseGuards(AuthGuard('jwt'))
  async confirmAvatarUpload(
    @Request() req: any,
    @Body() confirmDto: ConfirmAvatarUploadDto,
  ) {
    const employeeId = req.user.sub;
    const data = await this.employeeService.confirmAvatarUpload(
      employeeId,
      confirmDto.key,
      confirmDto.fileUrl,
    );

    return ResponseBuilder.createResponse({
      statusCode: 200,
      message: 'Avatar uploaded successfully',
      data,
    });
  }
}
