import { httpClient } from '../httpClient'

export interface ExportCreditCardStatementParams {
  creditCardId: string
  month: number
  year: number
}

export interface ExportCreditCardStatementResponse {
  bank: 'NUBANK'
  fileName: string
  csvContent: string
  totalRows: number
}

export async function exportStatement({
  creditCardId,
  month,
  year,
}: ExportCreditCardStatementParams) {
  const { data } = await httpClient.get<ExportCreditCardStatementResponse>(
    `/credit-cards/${creditCardId}/statements/export`,
    {
      params: { month, year },
    },
  )

  return data
}
