export interface Transaction {
  id: string
  createdAt: string
  updatedAt: string
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
  sourceRequestId?: string | null
  category?: {
    id: string
    name: string
    icon: string
  }
}
