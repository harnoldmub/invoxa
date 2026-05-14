import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(input: { companyName: string; tenantSlug: string; email: string; password: string; firstName?: string; lastName?: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.companyName,
        slug: input.tenantSlug,
        companies: { create: { name: input.companyName } },
        users: {
          create: {
            email: input.email.toLowerCase(),
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
      include: { companies: true, users: true },
    });

    const role = await this.prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'owner',
        permissions: ['*'],
        users: { create: { userId: tenant.users[0].id } },
      },
    });

    return this.session(tenant.id, tenant.slug, tenant.users[0].id, role.permissions);
  }

  async login(input: { tenantSlug: string; email: string; password: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (!tenant) throw new UnauthorizedException('Invalid credentials');

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: input.email.toLowerCase() } },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = user.roles.flatMap((entry) => entry.role.permissions);
    return this.session(tenant.id, tenant.slug, user.id, permissions);
  }

  private session(tenantId: string, tenantSlug: string, userId: string, permissions: string[]) {
    return {
      tenantId,
      tenantSlug,
      userId,
      permissions,
      accessToken: this.jwt.sign({ sub: userId, tenantId, permissions }),
    };
  }
}
