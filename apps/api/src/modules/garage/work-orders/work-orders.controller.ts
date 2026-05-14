import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../../common/request-context';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GarageWorkOrdersService } from './work-orders.service';

const workOrderSchema = z.object({
  vehicleId: z.string(),
  number: z.string().min(1),
  complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  repairPlan: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
});

const partLineSchema = z.object({
  partId: z.string().optional(),
  label: z.string(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

const laborLineSchema = z.object({
  label: z.string(),
  hours: z.coerce.number().positive(),
  hourlyRate: z.coerce.number().nonnegative(),
});

@Controller('modules/garage/work-orders')
export class GarageWorkOrdersController {
  constructor(private readonly workOrders: GarageWorkOrdersService) {}

  @Get(':id')
  get(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.workOrders.get(ctx, id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(workOrderSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof workOrderSchema>) {
    return this.workOrders.create(ctx, body);
  }

  @Post(':id/parts')
  @UsePipes(new ZodValidationPipe(partLineSchema))
  addPart(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: z.infer<typeof partLineSchema>) {
    return this.workOrders.addPart(ctx, id, body);
  }

  @Post(':id/labor')
  @UsePipes(new ZodValidationPipe(laborLineSchema))
  addLabor(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: z.infer<typeof laborLineSchema>) {
    return this.workOrders.addLabor(ctx, id, body);
  }
}
