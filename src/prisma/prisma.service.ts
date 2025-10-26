import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    super({
      log: configService.get<boolean>('app.prisma.logQueries')
        ? ['query', 'error', 'info', 'warn']
        : ['error', 'warn'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
