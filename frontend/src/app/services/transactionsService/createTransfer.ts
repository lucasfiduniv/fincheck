import { httpClient } from '../httpClient'

export interface CreateTransferParams {
  fromBankAccountId: string
  toBankAccountId: string
  value: number
  date: string
  description?: string
}

export async function createTransfer(params: CreateTransferParams) {
  const { data } = await httpClient.post('/transactions/transfers', params)

  return data
}
