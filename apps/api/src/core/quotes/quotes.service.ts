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

  async update(ctx: RequestContext, id: string, input: any) {
    const { lines, ...data } = input;
    const computed = lines ? totals(lines) : {};
    return this.prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.quoteLine.deleteMany({ where: { tenantId: ctx.tenantId, quoteId: id } });
      }
      return tx.quote.update({
        where: { id, tenantId: ctx.tenantId },
        data: {
          ...data,
          ...computed,
          ...(lines
            ? {
              lines: {
                create: lines.map((line: any) => ({
                  tenantId: ctx.tenantId,
                  ...line,
                  total: line.quantity * line.unitPrice * (1 + line.taxRate / 100),
                })),
              },
            }
            : {}),
        },
        include: { lines: true },
      });
    });
  }

  async remove(ctx: RequestContext, id: string) {
    await this.prisma.$transaction([
      this.prisma.quoteLine.deleteMany({ where: { tenantId: ctx.tenantId, quoteId: id } }),
      this.prisma.quote.delete({ where: { id, tenantId: ctx.tenantId } }),
    ]);
    return { deleted: true };
  }
}
