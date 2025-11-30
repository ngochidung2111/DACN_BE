import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LoginRequestDto, LoginResponseDto, RefreshTokenRequestDto } from '../dto/login.dto';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import { ResponseBuilder } from 'src/lib/dto/response-builder.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
