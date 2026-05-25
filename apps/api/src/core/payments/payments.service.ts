import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  byInvoice(ctx: RequestContext, invoiceId: string) {
    return this.prisma.payment.findMany({ where: { tenantId: ctx.tenantId, invoiceId }, orderBy: { paidAt: 'desc' } });
  }

  async create(ctx: RequestContext, input: { invoiceId: string; amount: number; method: string; reference?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirstOrThrow({ where: { id: input.invoiceId, tenantId: ctx.tenantId } });
      const payment = await tx.payment.create({ data: { tenantId: ctx.tenantId, ...input } });
      const amountPaid = Number(invoice.amountPaid) + input.amount;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid,
          paymentStatus: amountPaid >= Number(invoice.total) ? 'PAID' : 'PARTIAL',
          status: amountPaid >= Number(invoice.total) ? 'PAID' : invoice.status,
        },
      });
      return payment;
    });
  }

  async remove(ctx: RequestContext, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId } });
      const invoice = await tx.invoice.findFirstOrThrow({ where: { id: payment.invoiceId, tenantId: ctx.tenantId } });
      const amountPaid = Math.max(0, Number(invoice.amountPaid) - Number(payment.amount));
      await tx.payment.delete({ where: { id } });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid,
          paymentStatus: amountPaid <= 0 ? 'PENDING' : amountPaid >= Number(invoice.total) ? 'PAID' : 'PARTIAL',
          status: amountPaid >= Number(invoice.total) ? 'PAID' : 'SENT',
        },
      });
      return { deleted: true };
    });
  }
}
