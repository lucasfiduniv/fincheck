export interface Transaction {
  id: string
  name: string
  categoryId: string
  bankAccountId: string
  value: number
  type: 'INCOME' | 'EXPENSE'
  date: string
  entryType?: 'SINGLE' | 'RECURRING' | 'INSTALLMENT'
  recurrenceGroupId?: string | null
  installmentNumber?: number | null
  installmentCount?: number | null
  category?: {
    id: string
    name: string
    icon: string
  }
}
