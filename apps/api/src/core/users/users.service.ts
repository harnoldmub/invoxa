import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: RequestContext) {
    return this.prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, status: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(ctx: RequestContext, input: { email: string; firstName?: string; lastName?: string; roleIds: string[] }) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
    return this.prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'INVITED',
        passwordHash,
        roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      },
      select: { id: true, email: true, status: true },
    });
  }
}
