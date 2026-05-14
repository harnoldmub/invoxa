import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.role.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: 'asc' } });
  }

  create(ctx: RequestContext, data: { name: string; permissions: string[] }) {
    return this.prisma.role.create({ data: { tenantId: ctx.tenantId, ...data } });
  }
}
