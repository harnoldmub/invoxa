import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { TemplatesService } from './templates.service';

const templateSchema = z.object({
  companyId: z.string(),
  module: z.string().optional(),
  type: z.string(),
  name: z.string().min(2),
  schema: z.record(z.unknown()).default({}),
  html: z.string().min(1),
});

@Controller('core/templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.templates.list(ctx);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(templateSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof templateSchema>) {
    return this.templates.create(ctx, body);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(templateSchema.partial()))
  update(@Tenant() ctx: RequestContext, @Param('id') id: string, @Body() body: Partial<z.infer<typeof templateSchema>>) {
    return this.templates.update(ctx, id, body);
  }

  @Delete(':id')
  remove(@Tenant() ctx: RequestContext, @Param('id') id: string) {
    return this.templates.remove(ctx, id);
  }
}
