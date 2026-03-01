import { httpClient } from '../httpClient'

interface SendTestParams {
  message?: string
}

export async function sendTest(params?: SendTestParams) {
  const { data } = await httpClient.post('/notifications/test', params ?? {})

  return data
}
