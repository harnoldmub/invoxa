import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CustomFieldsService } from './custom-fields.service';

const fieldSchema = z.object({
  companyId: z.string(),
  module: z.string().optional(),
  entityType: z.string(),
  key: z.string().regex(/^[a-zA-Z0-9_]+$/),
  label: z.string(),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'JSON']),
  required: z.boolean().default(false),
  options: z.array(z.unknown()).default([]),
  defaultValue: z.unknown().optional(),
});

@Controller('core/custom-fields')
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}

  @Get()
  list(@Tenant() ctx: RequestContext, @Query('entityType') entityType?: string, @Query('module') module?: string) {
    return this.fields.list(ctx, entityType, module);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(fieldSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof fieldSchema>) {
    return this.fields.create(ctx, body);
  }
}
