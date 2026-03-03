export type FuelType = 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID'

export interface VehicleFuelStats {
  recordsCount: number
  totalCost: number
  totalLiters: number
  averagePricePerLiter: number
  averageConsumptionKmPerLiter: number | null
  costPerKm: number | null
  lastOdometer: number | null
}

export interface VehicleMaintenanceStats {
  recordsCount: number
  totalCost: number
  lastMaintenanceDate: string | null
}

export interface Vehicle {
  id: string
  userId: string
  name: string
  model: string | null
  plate: string | null
  photoUrl: string | null
  fuelType: FuelType
  createdAt: string
  updatedAt: string
  fuelStats?: VehicleFuelStats
  maintenanceStats?: VehicleMaintenanceStats
}

export interface FuelRecord {
  id: string
  userId: string
  vehicleId: string
  transactionId: string
  odometer: number
  liters: number
  pricePerLiter: number
  totalCost: number
  createdAt: string
  transaction: {
    id: string
    name: string
    date: string
    value: number
  }
}

export interface VehicleDetails extends Vehicle {
  fuelRecords: FuelRecord[]
  maintenances: Array<{
    id: string
    source: 'ACCOUNT' | 'CARD'
    sourceId: string
    title: string
    amount: number
    date: string
    odometer: number | null
    sourceLabel: string
    category?: {
      id: string
      name: string
      icon: string
    } | null
  }>
  parts: Array<{
    id: string
    name: string
    brand: string | null
    quantity: number
    totalCost: number
    installedAt: string
    installedOdometer: number | null
    lifetimeKm: number | null
    nextReplacementOdometer: number | null
    notes: string | null
  }>
}
