import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LoginRequestDto, LoginResponseDto } from '../dto/login.dto';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Post('login')
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ status: 201, description: 'The user has been successfully logged in.', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginRequestDto: LoginRequestDto) {
    return this.authService.login(loginRequestDto);
  }

  @Post('signup')
  @ApiBody({ type: SignupRequestDto })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: SignupResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async signup(@Body() signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }
}
