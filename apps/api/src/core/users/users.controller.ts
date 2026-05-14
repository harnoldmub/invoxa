import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { Tenant, RequestContext } from '../../common/request-context';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { UsersService } from './users.service';

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
});

@Controller('core/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Tenant() ctx: RequestContext) {
    return this.users.list(ctx);
  }

  @Post('invite')
  @UsePipes(new ZodValidationPipe(inviteSchema))
  invite(@Tenant() ctx: RequestContext, @Body() body: z.infer<typeof inviteSchema>) {
    return this.users.invite(ctx, body);
  }
}
