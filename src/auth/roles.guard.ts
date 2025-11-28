import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesMeta = this.reflector.getAllAndOverride<string | string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // nếu không có role metadata -> cho phép
    if (!rolesMeta) return true;

    const requiredRoles = Array.isArray(rolesMeta)
      ? rolesMeta
      : typeof rolesMeta === 'string'
      ? [rolesMeta]
      : [];

    if (requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user) return false;

    // Chuẩn hoá user roles: hỗ trợ user.roles (array | string | csv) hoặc user.role (string)
    let userRoles: string[] = [];
    if (Array.isArray(user.roles)) {
      userRoles = user.roles;
    } else if (typeof user.roles === 'string') {
      userRoles = user.roles.includes(',') ? user.roles.split(',').map(r => r.trim()) : [user.roles];
    } else if (typeof user.role === 'string') {
      userRoles = [user.role];
    }

    if (userRoles.length === 0) return false;

    // So sánh case-insensitive
    const lowerUserRoles = userRoles.map(r => String(r).toLowerCase());
    return requiredRoles.some(role => lowerUserRoles.includes(String(role).toLowerCase()));
  }
}