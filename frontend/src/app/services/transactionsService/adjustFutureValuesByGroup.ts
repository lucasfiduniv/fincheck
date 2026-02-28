import { httpClient } from '../httpClient'

export interface AdjustFutureValuesByGroupParams {
  recurrenceGroupId: string
  value: number
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
