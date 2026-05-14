import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContext } from '../../../common/request-context';

@Injectable()
export class GaragePartsService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext, q?: string) {
    return this.prisma.garagePart.findMany({
      where: { tenantId: ctx.tenantId, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.garagePart.create({ data: { tenantId: ctx.tenantId, ...input } });
  }
}
