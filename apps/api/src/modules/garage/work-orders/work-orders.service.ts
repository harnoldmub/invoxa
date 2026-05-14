import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContext } from '../../../common/request-context';

@Injectable()
export class GarageWorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  get(ctx: RequestContext, id: string) {
    return this.prisma.garageWorkOrder.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
      include: { vehicle: { include: { customer: true } }, parts: true, labor: true },
    });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.garageWorkOrder.create({ data: { tenantId: ctx.tenantId, ...input }, include: { vehicle: true } });
  }

  addPart(ctx: RequestContext, workOrderId: string, input: { partId?: string; label: string; quantity: number; unitPrice: number }) {
    return this.prisma.garageWorkOrderPart.create({
      data: { tenantId: ctx.tenantId, workOrderId, ...input, total: input.quantity * input.unitPrice },
    });
  }

  addLabor(ctx: RequestContext, workOrderId: string, input: { label: string; hours: number; hourlyRate: number }) {
    return this.prisma.garageLaborLine.create({
      data: { tenantId: ctx.tenantId, workOrderId, ...input, total: input.hours * input.hourlyRate },
    });
  }
}
