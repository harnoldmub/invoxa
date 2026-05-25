import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext, q?: string) {
    return this.prisma.product.findMany({
      where: { tenantId: ctx.tenantId, active: true, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.product.create({ data: { tenantId: ctx.tenantId, ...input } });
  }

  update(ctx: RequestContext, id: string, input: any) {
    return this.prisma.product.update({ where: { id, tenantId: ctx.tenantId }, data: input });
  }

  remove(ctx: RequestContext, id: string) {
    return this.prisma.product.update({ where: { id, tenantId: ctx.tenantId }, data: { active: false } });
  }
}
