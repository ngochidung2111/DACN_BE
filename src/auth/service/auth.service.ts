import * as bcrypt from 'bcrypt';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { LoginRequestDto } from '../dto/login.dto';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';
import { EmployeeService } from './employee.service';
import { config } from 'process';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.employeeService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      // a real implementation would use bcrypt
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.employeeService.findOneByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, roles: user.roles, tokenVersion: user.tokenVersion ?? 0 };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.configService.get('auth.jwtExpiresIn') });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: this.configService.get('auth.refreshTokenExpiresIn') });

    return { accessToken, refreshToken };
  }
  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    const employee = await this.employeeService.create(signupDto);
    return plainToInstance(SignupResponseDto, employee, {excludeExtraneousValues: true});
  }
  
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.employeeService.findOneByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, roles: user.roles, tokenVersion: user.tokenVersion ?? 0 },
        { expiresIn: '15m' },
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    await this.employeeService.changePassword(userId, newPassword);

    return { success: true };
  }

  async logout(userId: string) {
    await this.employeeService.logout(userId);
    return { success: true };
  }
}