import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CatalogService } from './catalog.service';

const productSchema = z.object({
  companyId: z.string(),
  sku: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.string().default('service'),
  unit: z.string().default('unit'),
  unitPrice: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().default(20),
  customData: z.record(z.unknown()).default({}),
});

@Controller('core/catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('items')
  list(@Tenant() ctx: RequestContext, @Query('q') q?: string) {
    return this.catalog.list(ctx, q);
  }

  @Post('items')
  @UsePipes(new ZodValidationPipe(productSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof productSchema>) {
    return this.catalog.create(ctx, body);
  }

  @Patch('items/:id')
  @UsePipes(new ZodValidationPipe(productSchema.partial()))
  update(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: Partial<z.infer<typeof productSchema>>) {
    return this.catalog.update(ctx, id, body);
  }

  @Delete('items/:id')
  remove(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.catalog.remove(ctx, id);
  }
}
