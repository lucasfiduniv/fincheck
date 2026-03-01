export interface Transaction {
  id: string
  name: string
  categoryId: string | null
  bankAccountId: string
  value: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: string
  status: 'POSTED' | 'PLANNED'
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
