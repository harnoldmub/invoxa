import { Body, Controller, Delete, Get, Param, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { PaymentsService } from './payments.service';

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.string().min(2),
  reference: z.string().optional(),
});

@Controller('core/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('invoice/:invoiceId')
  byInvoice(@Tenant() ctx: RequestContext, @Param('invoiceId') invoiceId: string) {
    return this.payments.byInvoice(ctx, invoiceId);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(paymentSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof paymentSchema>) {
    return this.payments.create(ctx, body);
  }

  @Delete(':id')
  remove(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.payments.remove(ctx, id);
  }
}
