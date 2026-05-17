import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect().catch((err) => {
      console.error('Prisma connection error on startup:', err.message);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
