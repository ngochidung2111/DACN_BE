import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmployeeService } from './employee.service';
import { SignupRequestDto, SignupResponseDto } from '../dto/signup.dto';
import { LoginRequestDto } from '../dto/login.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.employeeService.findOneByEmail(email);
    if (user && await bcrypt.compare(pass, user.password_hash)) { // a real implementation would use bcrypt
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginRequestDto: LoginRequestDto) {
    console.log(loginRequestDto);
    
    const user = await this.employeeService.findOneByEmail(loginRequestDto.email);

    if (user && await bcrypt.compare(loginRequestDto.password, user.password_hash)) { // securely compare password
      const { password_hash, ...result } = user;
   
      const payload = { username: result.name, sub: result.id, roles: result.roles };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    return null;
  }
  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    const employee = await this.employeeService.create(signupDto);
    return {
      id: employee.id,
      email: employee.email,
      roles: employee.roles,
    };
  }
}
