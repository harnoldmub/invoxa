import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { InvoicesService } from './invoices.service';

const lineSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  taxRate: z.coerce.number().default(20),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
});

const invoiceSchema = z.object({
  companyId: z.string(),
  customerId: z.string(),
  quoteId: z.string().optional(),
  number: z.string().min(1),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  businessModule: z.string().optional(),
  businessObjectType: z.string().optional(),
  businessObjectId: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
  lines: z.array(lineSchema).min(1),
});

@Controller('core/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.invoices.list(ctx);
  }

  @Get(':id')
  get(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.invoices.get(ctx, id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(invoiceSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof invoiceSchema>) {
    return this.invoices.create(ctx, body);
  }
}
