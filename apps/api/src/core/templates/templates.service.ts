import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.documentTemplate.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.documentTemplate.create({ data: { tenantId: ctx.tenantId, ...input } });
  }

  update(ctx: RequestContext, id: string, input: any) {
    return this.prisma.documentTemplate.update({ where: { id, tenantId: ctx.tenantId }, data: input });
  }

  async remove(ctx: RequestContext, id: string) {
    await this.prisma.documentTemplate.delete({ where: { id, tenantId: ctx.tenantId } });
    return { deleted: true };
  }
}
