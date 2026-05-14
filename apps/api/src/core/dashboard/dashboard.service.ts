import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(ctx: RequestContext) {
    const [customers, quotes, invoices, vehicles, recentInvoices] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.quote.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.invoice.aggregate({ where: { tenantId: ctx.tenantId }, _count: true, _sum: { total: true, amountPaid: true } }),
      this.prisma.garageVehicle.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.invoice.findMany({ where: { tenantId: ctx.tenantId }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return {
      counters: {
        customers,
        quotes,
        invoices: invoices._count,
        vehicles,
        revenue: invoices._sum.total ?? 0,
        collected: invoices._sum.amountPaid ?? 0,
      },
      recentInvoices,
    };
  }
}
