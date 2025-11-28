import { ExtractJwt, Strategy } from 'passport-jwt';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import e from 'express';
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

    // if payload already contains email/roles return normalized user
    if (payload && (payload.email || payload.roles)) {
      return {
        userId: payload.sub,
        email: payload.email ?? null,
        username: payload.username ?? null,
        roles: payload.roles ?? (payload.role ? [payload.role] : []),
      };
    }

    // fallback: load user from DB to ensure roles/email present
    const user = await this.employeeService.findOneById(payload.sub); // implement/findOneById with relations:['roles']
    if (!user) {
      return null;
    }
    return {
      userId: user.id,
      email: user.email,
      roles: user.roles ?? user.roles ?? [],
    };
  }
}
