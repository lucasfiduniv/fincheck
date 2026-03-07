import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { env } from 'src/shared/config/env'

export type TransactionsChangedAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'IMPORTED'

export interface TransactionsChangedEvent {
  action: TransactionsChangedAction
  count?: number
  source?: 'MANUAL' | 'BANK_IMPORT' | 'SYSTEM'
  transactionIds?: string[]
}

export type FinancialImportSource = 'BANK_STATEMENT' | 'CREDIT_CARD_STATEMENT'
export type FinancialImportStage = 'STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface FinancialImportProgressEvent {
  source: FinancialImportSource
  stage: FinancialImportStage
  progress: number
  processedRows: number
  totalRows: number
  importedCount: number
  skippedCount: number
  failedCount: number
  elapsedMs: number
  etaMs?: number
  message?: string
  requestId?: string
  bankAccountId?: string
  creditCardId?: string
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TransactionsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client)

    if (!token) {
      client.disconnect(true)
      return
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: env.jwtSecret,
      })

      if (!payload?.sub) {
        client.disconnect(true)
        return
      }

      client.join(this.getUserRoom(payload.sub))
    } catch {
      client.disconnect(true)
    }
  }

  emitTransactionsChanged(userId: string, payload: TransactionsChangedEvent) {
    this.server.to(this.getUserRoom(userId)).emit('transactions.changed', {
      ...payload,
      emittedAt: new Date().toISOString(),
    })
  }

  emitFinancialImportProgress(userId: string, payload: FinancialImportProgressEvent) {
    this.server.to(this.getUserRoom(userId)).emit('financial-import.progress', {
      ...payload,
      emittedAt: new Date().toISOString(),
    })
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim()
    }

    const authorizationHeader = client.handshake.headers.authorization

    if (!authorizationHeader) {
      return undefined
    }

    const [type, token] = authorizationHeader.split(' ')

    if (type === 'Bearer' && token) {
      return token
    }

    return undefined
  }
}