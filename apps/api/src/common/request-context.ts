import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestContext = {
  tenantId: string;
  userId?: string;
};

export const Tenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestContext => {
  const request = ctx.switchToHttp().getRequest();
  const tenantId = request.headers['x-tenant-id'];
  const userId = request.user?.sub ?? request.headers['x-user-id'];

  if (!tenantId || Array.isArray(tenantId)) {
    throw new BadRequestException('Missing x-tenant-id header');
  }

  return { tenantId, userId };
});
