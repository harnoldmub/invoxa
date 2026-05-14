import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext, entityType?: string, module?: string) {
    return this.prisma.customFieldDefinition.findMany({ where: { tenantId: ctx.tenantId, entityType, module }, orderBy: { label: 'asc' } });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.customFieldDefinition.create({ data: { tenantId: ctx.tenantId, ...input } });
  }
}
