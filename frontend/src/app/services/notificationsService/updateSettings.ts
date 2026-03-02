import { NotificationSettings } from '../../entities/NotificationSettings'
import { httpClient } from '../httpClient'

export interface UpdateSettingsParams {
  phoneNumber?: string
  notificationsEnabled?: boolean
  preferences?: Partial<NotificationSettings['preferences']>
}

type UpdateSettingsResponse = Pick<NotificationSettings, 'phoneNumber' | 'notificationsEnabled'>

export async function updateSettings(params: UpdateSettingsParams) {
  const { data } = await httpClient.patch<UpdateSettingsResponse>('/notifications/settings', params)

  return data
}
