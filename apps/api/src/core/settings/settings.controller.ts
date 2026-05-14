import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('core/settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':companyId')
  get(@Tenant() ctx: RequestContext, @Param('companyId') companyId: string) {
    return this.prisma.company.findFirstOrThrow({ where: { tenantId: ctx.tenantId, id: companyId }, select: { settings: true } });
  }

  @Patch(':companyId')
  update(@Tenant() ctx: RequestContext, @Param('companyId') companyId: string, @Body() body: { settings: object }) {
    return this.prisma.company.update({ where: { id: companyId, tenantId: ctx.tenantId }, data: { settings: body.settings } });
  }
}
