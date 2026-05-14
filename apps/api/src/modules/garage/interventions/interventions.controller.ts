import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../../common/request-context';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GarageInterventionsService } from './interventions.service';

const interventionSchema = z.object({
  vehicleId: z.string(),
  title: z.string().min(2),
  status: z.string().default('planned'),
  diagnosis: z.string().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  mileage: z.coerce.number().int().optional(),
  notes: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
});

@Controller('modules/garage/interventions')
export class GarageInterventionsController {
  constructor(private readonly interventions: GarageInterventionsService) {}

  @Get('vehicle/:vehicleId')
  byVehicle(@Tenant() ctx: RequestContext, @Param('vehicleId') vehicleId: string) {
    return this.interventions.byVehicle(ctx, vehicleId);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(interventionSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof interventionSchema>) {
    return this.interventions.create(ctx, body);
  }
}
