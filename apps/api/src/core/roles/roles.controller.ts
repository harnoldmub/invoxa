import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { RolesService } from './roles.service';

const roleSchema = z.object({ name: z.string().min(2), permissions: z.array(z.string()).default([]) });

@Controller('core/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.roles.list(ctx);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(roleSchema))
  create(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof roleSchema>) {
    return this.roles.create(ctx, body);
  }
}
