export interface NotificationPreferences {
  dueReminders: boolean
  creditCardDue: boolean
  budgetAlerts: boolean
  lowBalance: boolean
  weeklySummary: boolean
}

export interface NotificationSettings {
  phoneNumber: string | null
  notificationsEnabled: boolean
  preferences: NotificationPreferences
  hasEvolutionConfigured: boolean
}
