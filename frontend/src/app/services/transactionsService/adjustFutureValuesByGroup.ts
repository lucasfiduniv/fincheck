import { httpClient } from '../httpClient'

export type RecurrenceAdjustmentScope = 'THIS' | 'THIS_AND_NEXT' | 'ALL'

export interface AdjustFutureValuesByGroupParams {
  recurrenceGroupId: string
  transactionId?: string
  value: number
  scope?: RecurrenceAdjustmentScope
  fromDate?: string
}

export async function adjustFutureValuesByGroup({
  recurrenceGroupId,
  ...params
}: AdjustFutureValuesByGroupParams) {
  const { data } = await httpClient.patch(
    `/transactions/recurrence-groups/${recurrenceGroupId}/future-values`,
    params,
  )

  return data
}
