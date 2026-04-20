import { ExtractJwt, Strategy } from 'passport-jwt';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { EmployeeService } from './service/employee.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService, 
    private readonly employeeService:  EmployeeService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret') || 'fallback-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.employeeService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles ?? [],
    };
  }
}
