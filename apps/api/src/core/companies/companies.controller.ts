import { Body, Controller, Get, Param, Patch, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CompaniesService } from './companies.service';

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  legalName: z.string().optional(),
  vatNumber: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

@Controller('core/companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.companies.list(ctx);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateCompanySchema))
  update(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: z.infer<typeof updateCompanySchema>) {
    return this.companies.update(ctx, id, body);
  }
}
