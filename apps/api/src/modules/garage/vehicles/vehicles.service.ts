import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContext } from '../../../common/request-context';

@Injectable()
export class GarageVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext, q?: string) {
    const contains = q ? { contains: q, mode: 'insensitive' as const } : undefined;
    return this.prisma.garageVehicle.findMany({
      where: { tenantId: ctx.tenantId, ...(contains ? { OR: [{ plateNumber: contains }, { brand: contains }, { model: contains }] } : {}) },
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  byPlate(ctx: RequestContext, plateNumber: string) {
    return this.prisma.garageVehicle.findFirstOrThrow({
      where: { tenantId: ctx.tenantId, plateNumber: plateNumber.toUpperCase().replace(/\s/g, '') },
      include: { customer: true, interventions: true, workOrders: { include: { parts: true, labor: true } } },
    });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.garageVehicle.create({ data: { tenantId: ctx.tenantId, ...input } });
  }

  update(ctx: RequestContext, id: string, input: any) {
    return this.prisma.garageVehicle.update({ where: { id, tenantId: ctx.tenantId }, data: input });
  }

  async remove(ctx: RequestContext, id: string) {
    await this.prisma.$transaction([
      this.prisma.garageWorkOrderPart.deleteMany({ where: { tenantId: ctx.tenantId, workOrder: { vehicleId: id } } }),
      this.prisma.garageLaborLine.deleteMany({ where: { tenantId: ctx.tenantId, workOrder: { vehicleId: id } } }),
      this.prisma.garageWorkOrder.deleteMany({ where: { tenantId: ctx.tenantId, vehicleId: id } }),
      this.prisma.garageIntervention.deleteMany({ where: { tenantId: ctx.tenantId, vehicleId: id } }),
      this.prisma.garageVehicle.delete({ where: { id, tenantId: ctx.tenantId } }),
    ]);
    return { deleted: true };
  }
}
