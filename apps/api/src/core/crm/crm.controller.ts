import { Body, Controller, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CrmService } from './crm.service';

const customerSchema = z.object({
  companyId: z.string(),
  type: z.string().default('company'),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingInfo: z.record(z.unknown()).default({}),
  customData: z.record(z.unknown()).default({}),
});

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  customData: z.record(z.unknown()).default({}),
});

@Controller('core/crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('customers')
  customers(@Tenant() ctx: RequestContext, @Query('q') q?: string) {
    return this.crm.customers(ctx, q);
  }

  @Post('customers')
  @UsePipes(new ZodValidationPipe(customerSchema))
  createCustomer(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof customerSchema>) {
    return this.crm.createCustomer(ctx, body);
  }

  @Get('customers/:id/contacts')
  contacts(@Tenant() ctx: RequestContext, @Param('id') customerId: string) {
    return this.crm.contacts(ctx, customerId);
  }

  @Post('customers/:id/contacts')
  @UsePipes(new ZodValidationPipe(contactSchema))
  createContact(@Tenant() ctx: RequestContext, @Param('id') customerId: string, @Body() body: z.infer<typeof contactSchema>) {
    return this.crm.createContact(ctx, customerId, body);
  }
}
