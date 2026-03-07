import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)
  private reconnectingPromise: Promise<void> | null = null
  private readonly readActions = new Set([
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
    'findRaw',
    'aggregateRaw',
  ])

  async onModuleInit() {
    await this.$connect()

    this.$use(async (params, next) => {
      try {
        return await next(params)
      } catch (error) {
        if (!this.shouldReconnect(error)) {
          throw error
        }

        this.logger.warn(
          `Conexão com banco interrompida durante ${params.model}.${params.action}. Tentando reconectar...`,
        )

        await this.reconnect()

        if (!this.readActions.has(params.action)) {
          throw error
        }

        return next(params)
      }
    })
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close()
    })
  }

  private shouldReconnect(error: unknown) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : ''

    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message).toLowerCase()
        : ''

    if (errorCode === 'P1017' || errorCode === 'P1001') {
      return true
    }

    return (
      errorMessage.includes('server has closed the connection')
      || errorMessage.includes('connection terminated')
      || errorMessage.includes('connection closed')
    )
  }

  private async reconnect() {
    if (!this.reconnectingPromise) {
      this.reconnectingPromise = (async () => {
        try {
          await this.$disconnect().catch(() => undefined)
          await this.$connect()
          this.logger.log('Conexão com banco restabelecida.')
        } finally {
          this.reconnectingPromise = null
        }
      })()
    }

    await this.reconnectingPromise
  }
}
