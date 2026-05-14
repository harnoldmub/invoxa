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

  contacts(ctx: RequestContext, customerId: string) {
    return this.prisma.contact.findMany({ where: { tenantId: ctx.tenantId, customerId }, orderBy: { createdAt: 'desc' } });
  }

  createContact(ctx: RequestContext, customerId: string, input: any) {
    return this.prisma.contact.create({ data: { tenantId: ctx.tenantId, customerId, ...input } });
  }
}
