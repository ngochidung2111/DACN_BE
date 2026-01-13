import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
