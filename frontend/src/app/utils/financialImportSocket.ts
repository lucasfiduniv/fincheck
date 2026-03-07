import { io, Socket } from 'socket.io-client'
import { localStorageKeys } from '../config/localStorageKeys'

export type FinancialImportSocketSource = 'BANK_STATEMENT' | 'CREDIT_CARD_STATEMENT'
export type FinancialImportSocketStage = 'STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface FinancialImportProgressSocketEvent {
  source: FinancialImportSocketSource
  stage: FinancialImportSocketStage
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
  emittedAt: string
}

export const FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT = 'financial-import.progress'

export function connectFinancialImportSocket() {
  const accessToken = localStorage.getItem(localStorageKeys.ACCESS_TOKEN)

  if (!accessToken) {
    return null
  }

  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket'],
    auth: {
      token: accessToken,
    },
  }) as Socket
}
