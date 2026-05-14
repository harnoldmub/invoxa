import { Body, Controller, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../../common/request-context';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GarageVehiclesService } from './vehicles.service';

const vehicleSchema = z.object({
  companyId: z.string(),
  customerId: z.string().optional(),
  plateNumber: z.string().min(2).transform((value) => value.toUpperCase().replace(/\s/g, '')),
  vin: z.string().optional(),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().optional(),
  mileage: z.coerce.number().int().optional(),
  fuelType: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
});

@Controller('modules/garage/vehicles')
export class GarageVehiclesController {
  constructor(private readonly vehicles: GarageVehiclesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext, @Query('q') q?: string) {
    return this.vehicles.list(ctx, q);
  }

  @Get('plate/:plateNumber')
  byPlate(@Tenant() ctx: RequestContext, @Param('plateNumber') plateNumber: string) {
    return this.vehicles.byPlate(ctx, plateNumber);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(vehicleSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof vehicleSchema>) {
    return this.vehicles.create(ctx, body);
  }
}
