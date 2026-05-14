import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

const totals = (lines: Array<{ quantity: number; unitPrice: number; taxRate: number }>) => {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0);
  return { subtotal, taxTotal, total: subtotal + taxTotal };
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.invoice.findMany({ where: { tenantId: ctx.tenantId }, include: { customer: true, payments: true }, orderBy: { createdAt: 'desc' } });
  }

  get(ctx: RequestContext, id: string) {
    return this.prisma.invoice.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId }, include: { company: true, customer: true, lines: true, payments: true } });
  }

  create(ctx: RequestContext, input: any) {
    const computed = totals(input.lines);
    return this.prisma.invoice.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: input.companyId,
        customerId: input.customerId,
        quoteId: input.quoteId,
        number: input.number,
        dueDate: input.dueDate,
        notes: input.notes,
        businessModule: input.businessModule,
        businessObjectType: input.businessObjectType,
        businessObjectId: input.businessObjectId,
        customData: input.customData,
        ...computed,
        lines: {
          create: input.lines.map((line: any) => ({
            tenantId: ctx.tenantId,
            ...line,
            total: line.quantity * line.unitPrice * (1 + line.taxRate / 100),
          })),
        },
      },
      include: { lines: true },
    });
  }
}
