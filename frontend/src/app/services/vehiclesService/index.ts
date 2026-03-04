import { Vehicle, VehicleDetails } from '../../entities/Vehicle'
import { httpClient } from '../httpClient'

export interface CreateVehicleParams {
  name: string
  model?: string
  plate?: string
  photoUrl?: string
  currentOdometer?: number
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
}

export interface UpdateVehicleParams {
  vehicleId: string
  name?: string
  model?: string
  plate?: string
  photoUrl?: string
  currentOdometer?: number
  fuelType?: 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID'
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
}
