import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.company.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: 'asc' } });
  }

  update(ctx: RequestContext, id: string, data: object) {
    return this.prisma.company.update({ where: { id, tenantId: ctx.tenantId }, data });
  }
}
