import { httpClient } from '../httpClient'

export type SupportedCreditCardStatementBank = 'NUBANK'

export interface ImportCreditCardStatementParams {
  creditCardId: string
  bank: SupportedCreditCardStatementBank
  csvContent: string
  requestId?: string
}

interface ImportCreditCardStatementRequestOptions {
  onUploadProgress?: (percentage: number) => void
}

export interface ImportCreditCardStatementResponse {
  bank: SupportedCreditCardStatementBank
  totalRows: number
  uniqueRows: number
  importedCount: number
  importedPaymentsCount?: number
  skippedCount: number
  failedCount: number
}

export async function importStatement(
  { creditCardId, ...params }: ImportCreditCardStatementParams,
  options?: ImportCreditCardStatementRequestOptions,
) {
  const { data } = await httpClient.post<ImportCreditCardStatementResponse>(
    `/credit-cards/${creditCardId}/statements/import`,
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
