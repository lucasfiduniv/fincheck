import { httpClient } from '../httpClient'

export type SupportedStatementBank = 'NUBANK' | 'BANCO_DO_BRASIL'

export interface ImportStatementParams {
  bank: SupportedStatementBank
  bankAccountId: string
  csvContent: string
  requestId?: string
}

interface ImportStatementRequestOptions {
  onUploadProgress?: (percentage: number) => void
}

export interface ImportStatementResponse {
  bank: SupportedStatementBank
  totalRows: number
  uniqueRows: number
  importedCount: number
  skippedCount: number
  failedCount: number
  aiEnhancedCount?: number
  transferDetectedCount?: number
  cardBillPaymentDetectedCount?: number
}

export async function importStatement(
  params: ImportStatementParams,
  options?: ImportStatementRequestOptions,
) {
  const { data } = await httpClient.post<ImportStatementResponse>(
    '/transactions/import-statement',
    params,
    {
      onUploadProgress: (event) => {
        if (!options?.onUploadProgress) {
          return
        }

        if (!event.total || event.total <= 0) {
          options.onUploadProgress(0)
          return
        }

        const percentage = Math.min(100, Math.round((event.loaded / event.total) * 100))

        options.onUploadProgress(percentage)
      },
    },
  )

  return data
}
