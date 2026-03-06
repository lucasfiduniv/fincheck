import { httpClient } from '../httpClient'

export type SupportedStatementBank = 'NUBANK'

export interface ImportStatementParams {
  bank: SupportedStatementBank
  bankAccountId: string
  csvContent: string
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

export async function importStatement(params: ImportStatementParams) {
  const { data } = await httpClient.post<ImportStatementResponse>(
    '/transactions/import-statement',
    params,
  )

  return data
}
