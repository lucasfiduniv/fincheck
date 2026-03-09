export type InlineFeedbackState = {
  status: 'saving' | 'synced' | 'error' | 'stale'
  message: string
}

export type TimelineFilter = 'ALL' | 'FUEL' | 'MAINTENANCE' | 'PART'

export interface TimelineItem {
  id: string
  type: Exclude<TimelineFilter, 'ALL'>
  date: string
  title: string
  subtitle: string
  amount: number
  detail: string
}
