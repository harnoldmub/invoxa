import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

const totals = (lines: Array<{ quantity: number; unitPrice: number; taxRate: number }>) => {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0);
  return { subtotal, taxTotal, total: subtotal + taxTotal };
};

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.quote.findMany({ where: { tenantId: ctx.tenantId }, include: { customer: true, lines: true }, orderBy: { createdAt: 'desc' } });
  }

  get(ctx: RequestContext, id: string) {
    return this.prisma.quote.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId }, include: { company: true, customer: true, lines: true } });
  }

  create(ctx: RequestContext, input: any) {
    const computed = totals(input.lines);
    return this.prisma.quote.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: input.companyId,
        customerId: input.customerId,
        number: input.number,
        validUntil: input.validUntil,
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
