import { httpClient } from '../httpClient'

export interface UpdateTransactionStatusParams {
  id: string
  status: 'POSTED' | 'PLANNED'
}

export async function updateStatus({ id, status }: UpdateTransactionStatusParams) {
  const { data } = await httpClient.patch(`/transactions/${id}/status`, { status })

  return data
}
