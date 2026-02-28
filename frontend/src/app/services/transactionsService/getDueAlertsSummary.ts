import { httpClient } from '../httpClient'

export interface DueAlertSummaryItem {
  id: string
  recurrenceGroupId?: string | null
  name: string
  entryType: 'SINGLE' | 'RECURRING' | 'INSTALLMENT'
  dueDay: number
  alertDaysBefore: number
  amount: number
  daysUntilDue: number
  status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'FUTURE'
  hasAlert: boolean
}

interface DueAlertsSummaryFilters {
  month: number
  year: number
}

type DueAlertsSummaryResponse = Array<DueAlertSummaryItem>

export async function getDueAlertsSummary(filters: DueAlertsSummaryFilters) {
  const { data } = await httpClient.get<DueAlertsSummaryResponse>('/transactions/due-alerts/summary', {
    params: filters,
  })

  return data
}
