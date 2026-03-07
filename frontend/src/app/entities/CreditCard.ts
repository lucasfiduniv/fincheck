export interface CreditCard {
  id: string
  name: string
  brand?: string | null
  color: string
  creditLimit: number
  closingDay: number
  dueDay: number
  bankAccountId: string
  isActive: boolean
  usedLimit: number
  availableLimit: number
  currentStatementTotal: number
  nextDueDate?: string | null
}

export interface CreditCardStatementInstallment {
  id: string
  purchaseId: string
  amount: number
  purchaseAmount: number
  fuelVehicleId?: string | null
  fuelOdometer?: number | null
  fuelLiters?: number | null
  fuelPricePerLiter?: number | null
  fuelFillType?: 'FULL' | 'PARTIAL'
  fuelFirstPumpClick?: boolean
  maintenanceVehicleId?: string | null
  maintenanceOdometer?: number | null
  status: 'PENDING' | 'PAID' | 'CANCELED'
  installmentNumber: number
  installmentCount: number
  description: string
  purchaseDate: string
  category?: {
    id: string
    name: string
    icon: string
  } | null
}

export interface CreditCardStatement {
  card: {
    id: string
    name: string
    dueDay: number
    closingDay: number
  }
  month: number
  year: number
  dueDate: string
  total: number
  paid: number
  pending: number
  status: 'OPEN' | 'PAID' | 'OVERDUE'
  installments: CreditCardStatementInstallment[]
}
