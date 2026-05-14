import { Controller, Get, Query } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('core/activity')
export class ActivityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Tenant() ctx: RequestContext, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.prisma.activityLog.findMany({ where: { tenantId: ctx.tenantId, entityType, entityId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
