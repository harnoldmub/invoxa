import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { QuotesService } from './quotes.service';

const lineSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().default(20),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

const quoteSchema = z.object({
  companyId: z.string(),
  customerId: z.string(),
  number: z.string().min(1),
  validUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
  businessModule: z.string().optional(),
  businessObjectType: z.string().optional(),
  businessObjectId: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
  lines: z.array(lineSchema).min(1),
});

@Controller('core/quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.quotes.list(ctx);
  }

  @Get(':id')
  get(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.quotes.get(ctx, id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(quoteSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof quoteSchema>) {
    return this.quotes.create(ctx, body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(quoteSchema.partial()))
  update(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: Partial<z.infer<typeof quoteSchema>>) {
    return this.quotes.update(ctx, id, body);
  }

  @Delete(':id')
  remove(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.quotes.remove(ctx, id);
  }
}
