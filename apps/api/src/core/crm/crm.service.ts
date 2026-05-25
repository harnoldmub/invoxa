import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  customers(ctx: RequestContext, q?: string) {
    return this.prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      include: { contacts: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  createCustomer(ctx: RequestContext, input: any) {
    return this.prisma.customer.create({ data: { tenantId: ctx.tenantId, ...input } });
  }

  updateCustomer(ctx: RequestContext, id: string, input: any) {
    return this.prisma.customer.update({ where: { id, tenantId: ctx.tenantId }, data: input });
  }

  async deleteCustomer(ctx: RequestContext, id: string) {
    await this.prisma.$transaction([
      this.prisma.payment.deleteMany({ where: { tenantId: ctx.tenantId, invoice: { customerId: id } } }),
      this.prisma.invoiceLine.deleteMany({ where: { tenantId: ctx.tenantId, invoice: { customerId: id } } }),
      this.prisma.invoice.deleteMany({ where: { tenantId: ctx.tenantId, customerId: id } }),
      this.prisma.quoteLine.deleteMany({ where: { tenantId: ctx.tenantId, quote: { customerId: id } } }),
      this.prisma.quote.deleteMany({ where: { tenantId: ctx.tenantId, customerId: id } }),
      this.prisma.garageVehicle.updateMany({ where: { tenantId: ctx.tenantId, customerId: id }, data: { customerId: null } }),
      this.prisma.contact.deleteMany({ where: { tenantId: ctx.tenantId, customerId: id } }),
      this.prisma.customer.delete({ where: { id, tenantId: ctx.tenantId } }),
    ]);
    return { deleted: true };
  }

  contacts(ctx: RequestContext, customerId: string) {
    return this.prisma.contact.findMany({ where: { tenantId: ctx.tenantId, customerId }, orderBy: { createdAt: 'desc' } });
  }

  createContact(ctx: RequestContext, customerId: string, input: any) {
    return this.prisma.contact.create({ data: { tenantId: ctx.tenantId, customerId, ...input } });
  }

  updateContact(ctx: RequestContext, id: string, input: any) {
    return this.prisma.contact.update({ where: { id, tenantId: ctx.tenantId }, data: input });
  }

  async deleteContact(ctx: RequestContext, id: string) {
    await this.prisma.contact.delete({ where: { id, tenantId: ctx.tenantId } });
    return { deleted: true };
  }
}
