export interface NotificationEvent {
  id: string
  type:
    | 'GENERAL'
    | 'DUE_REMINDERS'
    | 'CREDIT_CARD_DUE'
    | 'BUDGET_ALERTS'
    | 'LOW_BALANCE'
    | 'WEEKLY_SUMMARY'
  channel: 'WHATSAPP'
  status: 'PENDING' | 'SENT' | 'FAILED'
  destination: string
  message: string
  errorMessage: string | null
  createdAt: string
  sentAt: string | null
}
