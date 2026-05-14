import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../../common/request-context';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GaragePartsService } from './parts.service';

const partSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().default(0),
});

@Controller('modules/garage/parts')
export class GaragePartsController {
  constructor(private readonly parts: GaragePartsService) {}

  @Get()
  list(@Tenant() ctx: RequestContext, @Query('q') q?: string) {
    return this.parts.list(ctx, q);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(partSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof partSchema>) {
    return this.parts.create(ctx, body);
  }
}
