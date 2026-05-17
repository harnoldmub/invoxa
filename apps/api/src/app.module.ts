import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { CoreModule } from './core/core.module';
import { GarageModule } from './modules/garage/garage.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(isProduction
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', '..', 'apps', 'web', 'dist'),
            exclude: ['/api/(.*)'],
          }),
        ]
      : []),
    PrismaModule,
    CoreModule,
    GarageModule,
  ],
})
export class AppModule {}
