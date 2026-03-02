import { httpClient } from '../httpClient'
import {
  SavingsBoxDetails,
  SavingsBoxesAnnualPlanning,
  SavingsBoxesSummary,
} from '../../entities/SavingsBox'

export interface CreateSavingsBoxParams {
  name: string
  description?: string
  initialBalance?: number
  targetAmount?: number
  targetDate?: string
}

export interface SavingsBoxEntryParams {
  amount: number
  date: string
  description?: string
}

export interface SetSavingsBoxGoalParams {
  targetAmount?: number
  targetDate?: string
  alertEnabled?: boolean
}

export interface SetSavingsBoxRecurrenceParams {
  recurrenceEnabled?: boolean
  recurrenceDay?: number
  recurrenceAmount?: number
}

export interface SetSavingsBoxYieldParams {
  monthlyYieldRate?: number
  yieldMode?: 'PERCENT' | 'FIXED'
}

export interface ShareSavingsBoxParams {
  savingsBoxId: string
  friendUserId: string
}

export const savingsBoxesService = {
  async getAll() {
    const { data } = await httpClient.get<SavingsBoxesSummary>('/savings-boxes')

    return data
  },

  async getById(savingsBoxId: string) {
    const { data } = await httpClient.get<SavingsBoxDetails>(`/savings-boxes/${savingsBoxId}`)

    return data
  },

  async create(params: CreateSavingsBoxParams) {
    const { data } = await httpClient.post('/savings-boxes', params)

    return data
  },

  async update({ savingsBoxId, ...params }: { savingsBoxId: string } & Partial<CreateSavingsBoxParams>) {
    const { data } = await httpClient.patch(`/savings-boxes/${savingsBoxId}`, params)

    return data
  },

  async deposit({ savingsBoxId, ...params }: { savingsBoxId: string } & SavingsBoxEntryParams) {
    const { data } = await httpClient.post(`/savings-boxes/${savingsBoxId}/deposit`, params)

    return data
  },

  async withdraw({ savingsBoxId, ...params }: { savingsBoxId: string } & SavingsBoxEntryParams) {
    const { data } = await httpClient.post(`/savings-boxes/${savingsBoxId}/withdraw`, params)

    return data
  },

  async setGoal({ savingsBoxId, ...params }: { savingsBoxId: string } & SetSavingsBoxGoalParams) {
    const { data } = await httpClient.patch(`/savings-boxes/${savingsBoxId}/goal`, params)

    return data
  },

  async setRecurrence({ savingsBoxId, ...params }: { savingsBoxId: string } & SetSavingsBoxRecurrenceParams) {
    const { data } = await httpClient.patch(`/savings-boxes/${savingsBoxId}/recurrence`, params)

    return data
  },

  async runRecurrenceNow(savingsBoxId: string) {
    const { data } = await httpClient.post(`/savings-boxes/${savingsBoxId}/recurrence/run-now`)

    return data
  },

  async setYield({ savingsBoxId, ...params }: { savingsBoxId: string } & SetSavingsBoxYieldParams) {
    const { data } = await httpClient.patch(`/savings-boxes/${savingsBoxId}/yield`, params)

    return data
  },

  async runMonthlyYield(year: number, month: number) {
    const { data } = await httpClient.post('/savings-boxes/yield/run-month', undefined, {
      params: {
        year,
        month,
      },
    })

    return data
  },

  async getAnnualPlanning(year: number) {
    const { data } = await httpClient.get<SavingsBoxesAnnualPlanning>('/savings-boxes/planning/year', {
      params: {
        year,
      },
    })

    return data
  },

  async shareWithFriend({ savingsBoxId, friendUserId }: ShareSavingsBoxParams) {
    const { data } = await httpClient.post(`/savings-boxes/${savingsBoxId}/share`, {
      friendUserId,
    })

    return data
  },
}
