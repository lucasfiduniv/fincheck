import { NotificationEvent } from '../../entities/NotificationEvent'
import { httpClient } from '../httpClient'

type GetHistoryResponse = NotificationEvent[]

export async function getHistory(limit = 20) {
  const { data } = await httpClient.get<GetHistoryResponse>('/notifications/history', {
    params: { limit },
  })

  return data
}
