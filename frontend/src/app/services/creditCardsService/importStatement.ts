import { httpClient } from '../httpClient'

export type SupportedCreditCardStatementBank = 'NUBANK'

export interface ImportCreditCardStatementParams {
  creditCardId: string
  bank: SupportedCreditCardStatementBank
  csvContent: string
}

export interface ImportCreditCardStatementResponse {
  bank: SupportedCreditCardStatementBank
  totalRows: number
  uniqueRows: number
  importedCount: number
  skippedCount: number
  failedCount: number
}

export async function importStatement({ creditCardId, ...params }: ImportCreditCardStatementParams) {
  const { data } = await httpClient.post<ImportCreditCardStatementResponse>(
    `/credit-cards/${creditCardId}/statements/import`,
    params,
  )

  return data
}
