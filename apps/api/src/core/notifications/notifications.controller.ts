import { Controller, Get } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('core/notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.prisma.notification.findMany({ where: { tenantId: ctx.tenantId, OR: [{ userId: ctx.userId }, { userId: null }] }, orderBy: { createdAt: 'desc' } });
  }
}
