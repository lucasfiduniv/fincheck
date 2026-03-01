import { NotificationSettings } from '../../entities/NotificationSettings'
import { httpClient } from '../httpClient'

type GetSettingsResponse = NotificationSettings

export async function getSettings() {
  const { data } = await httpClient.get<GetSettingsResponse>('/notifications/settings')

  return data
}
