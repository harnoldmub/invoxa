import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContext } from '../../../common/request-context';

@Injectable()
export class GarageInterventionsService {
  constructor(private readonly prisma: PrismaService) {}

  byVehicle(ctx: RequestContext, vehicleId: string) {
    return this.prisma.garageIntervention.findMany({ where: { tenantId: ctx.tenantId, vehicleId }, orderBy: { createdAt: 'desc' } });
  }

  create(ctx: RequestContext, input: any) {
    return this.prisma.garageIntervention.create({ data: { tenantId: ctx.tenantId, ...input } });
  }
}
