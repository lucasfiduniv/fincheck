import { Vehicle, VehicleDetails } from '../../entities/Vehicle'
import { httpClient } from '../httpClient'

export interface CreateVehicleParams {
  name: string
  model?: string
  plate?: string
  photoUrl?: string
  currentOdometer?: number
  autoOdometerEnabled?: boolean
  averageDailyKm?: number
  odometerBaseValue?: number
  odometerBaseDate?: string
  fuelType?: 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID'
}

export interface CreateVehiclePartParams {
  vehicleId: string
  bankAccountId: string
  categoryId?: string
  name: string
  brand?: string
  quantity?: number
  totalCost: number
  installedAt: string
  installedOdometer?: number
  lifetimeKm?: number
  nextReplacementOdometer?: number
  notes?: string
  confirmOutlier?: boolean
}

export interface UpdateVehicleParams {
  vehicleId: string
  name?: string
  model?: string
  plate?: string
  photoUrl?: string
  currentOdometer?: number
  autoOdometerEnabled?: boolean
  averageDailyKm?: number
  odometerBaseValue?: number
  odometerBaseDate?: string
  confirmOutlier?: boolean
  fuelType?: 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID'
}

export interface TrackVehicleUsageEventParams {
  vehicleId?: string
  eventName: string
  screen?: string
  metadata?: Record<string, unknown>
}

export const vehiclesService = {
  async getAll() {
    const { data } = await httpClient.get<Vehicle[]>('/vehicles')

    return data
  },

  async getById(vehicleId: string) {
    const { data } = await httpClient.get<VehicleDetails>(`/vehicles/${vehicleId}`)

    return data
  },

  async create(params: CreateVehicleParams) {
    const { data } = await httpClient.post('/vehicles', params)

    return data
  },

  async update({ vehicleId, ...params }: UpdateVehicleParams) {
    const { data } = await httpClient.patch(`/vehicles/${vehicleId}`, params)

    return data
  },

  async createPart({ vehicleId, ...params }: CreateVehiclePartParams) {
    const { data } = await httpClient.post(`/vehicles/${vehicleId}/parts`, params)

    return data
  },

  async recalibrateNow(vehicleId: string) {
    const { data } = await httpClient.patch(`/vehicles/${vehicleId}/recalibrate-now`)

    return data
  },

  async trackUsageEvent(params: TrackVehicleUsageEventParams) {
    const { data } = await httpClient.post('/vehicles/usage-events', {
      ...params,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    })

    return data
  },

  async getAuditLogs(vehicleId: string, limit = 20) {
    const { data } = await httpClient.get(`/vehicles/${vehicleId}/audit`, {
      params: { limit },
    })

    return data
  },
}
