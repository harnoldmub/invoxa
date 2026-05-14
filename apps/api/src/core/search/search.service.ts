import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async query(ctx: RequestContext, q: string) {
    if (q.trim().length < 2) return [];
    const contains = { contains: q, mode: 'insensitive' as const };
    const [customers, products, quotes, invoices, vehicles] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId: ctx.tenantId, name: contains }, take: 8 }),
      this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, name: contains }, take: 8 }),
      this.prisma.quote.findMany({ where: { tenantId: ctx.tenantId, number: contains }, take: 8 }),
      this.prisma.invoice.findMany({ where: { tenantId: ctx.tenantId, number: contains }, take: 8 }),
      this.prisma.garageVehicle.findMany({ where: { tenantId: ctx.tenantId, OR: [{ plateNumber: contains }, { brand: contains }, { model: contains }] }, take: 8 }),
    ]);
    return [
      ...customers.map((item) => ({ type: 'customer', id: item.id, label: item.name })),
      ...products.map((item) => ({ type: 'product', id: item.id, label: item.name })),
      ...quotes.map((item) => ({ type: 'quote', id: item.id, label: item.number })),
      ...invoices.map((item) => ({ type: 'invoice', id: item.id, label: item.number })),
      ...vehicles.map((item) => ({ type: 'garage.vehicle', id: item.id, label: `${item.plateNumber} - ${item.brand} ${item.model}` })),
    ];
  }
}
