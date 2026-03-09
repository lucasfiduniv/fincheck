import { BadRequestException, Injectable } from '@nestjs/common'

export type OdometerEvent = {
  date: Date
  odometer: number
  source: 'FUEL' | 'MAINTENANCE' | 'PART'
}

export type FuelAnalyticsRecord = {
  id: string
  date: Date
  odometer: number
  liters: number
  totalCost: number
  fillType: 'FULL' | 'PARTIAL'
  firstPumpClick: boolean
  source: 'ACCOUNT' | 'CARD'
}

export type ComputedFuelSegment = {
  startFuelRecordId: string
  endFuelRecordId: string
  startDate: Date
  endDate: Date
  startOdometer: number
  endOdometer: number
  distanceKm: number
  litersConsumed: number
  totalCost: number
  consumptionKmPerLiter: number
  costPerKm: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

@Injectable()
export class VehiclesFuelMaintenanceService {
  toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  calculateFuelAnalytics(records: FuelAnalyticsRecord[], averageDailyKm?: number | null) {
    const ordered = [...records].sort((a, b) => a.date.getTime() - b.date.getTime())
    const segments: ComputedFuelSegment[] = []
    let activeStart: FuelAnalyticsRecord | null = null
    let litersSinceStart = 0
    let costSinceStart = 0

    ordered.forEach((record) => {
      if (!activeStart) {
        if (record.fillType === 'FULL') {
          activeStart = record
          litersSinceStart = 0
          costSinceStart = 0
        }
        return
      }

      litersSinceStart += record.liters
      costSinceStart += record.totalCost

      if (record.fillType !== 'FULL') {
        return
      }

      const distanceKm = Number((record.odometer - activeStart.odometer).toFixed(2))

      if (distanceKm > 0 && litersSinceStart > 0) {
        const consumptionKmPerLiter = Number((distanceKm / litersSinceStart).toFixed(2))
        const costPerKm = Number((costSinceStart / distanceKm).toFixed(4))
        const confidence = activeStart.firstPumpClick && record.firstPumpClick
          ? 'HIGH'
          : (activeStart.firstPumpClick || record.firstPumpClick)
              ? 'MEDIUM'
              : 'LOW'

        segments.push({
          startFuelRecordId: activeStart.id,
          endFuelRecordId: record.id,
          startDate: activeStart.date,
          endDate: record.date,
          startOdometer: activeStart.odometer,
          endOdometer: record.odometer,
          distanceKm,
          litersConsumed: Number(litersSinceStart.toFixed(2)),
          totalCost: Number(costSinceStart.toFixed(2)),
          consumptionKmPerLiter,
          costPerKm,
          confidence,
        })
      }

      activeStart = record
      litersSinceStart = 0
      costSinceStart = 0
    })

    const officialDistanceKm = Number(segments.reduce((acc, segment) => acc + segment.distanceKm, 0).toFixed(2))
    const officialLiters = Number(segments.reduce((acc, segment) => acc + segment.litersConsumed, 0).toFixed(2))
    const officialCost = Number(segments.reduce((acc, segment) => acc + segment.totalCost, 0).toFixed(2))
    const officialConsumptionKmPerLiter = officialDistanceKm > 0 && officialLiters > 0
      ? Number((officialDistanceKm / officialLiters).toFixed(2))
      : null
    const officialCostPerKm = officialDistanceKm > 0
      ? Number((officialCost / officialDistanceKm).toFixed(4))
      : null

    const now = new Date()
    const currentMonth = now.getUTCMonth()
    const currentYear = now.getUTCFullYear()
    const currentMonthCost = Number(
      ordered
        .filter((record) => record.date.getUTCMonth() === currentMonth && record.date.getUTCFullYear() === currentYear)
        .reduce((acc, record) => acc + record.totalCost, 0)
        .toFixed(2),
    )

    const currentDay = now.getUTCDate()
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate()
    const projectedMonthCost = currentDay > 0
      ? Number(((currentMonthCost / currentDay) * daysInMonth).toFixed(2))
      : null

    const averageKmPerSegment = segments.length > 0
      ? segments.reduce((acc, segment) => acc + segment.distanceKm, 0) / segments.length
      : null
    const nextRefuelInDays = averageKmPerSegment && averageDailyKm && averageDailyKm > 0
      ? Number((averageKmPerSegment / averageDailyKm).toFixed(1))
      : null

    const lastFullRecord = [...ordered].reverse().find((record) => record.fillType === 'FULL')
    const nextRefuelAtKm = averageKmPerSegment && lastFullRecord
      ? Number((lastFullRecord.odometer + averageKmPerSegment).toFixed(1))
      : null

    return {
      segments,
      officialConsumptionKmPerLiter,
      officialCostPerKm,
      officialDistanceKm,
      officialLiters,
      currentMonthCost,
      projectedMonthCost,
      nextRefuelInDays,
      nextRefuelAtKm,
    }
  }

  calculateEffectiveCurrentOdometer(vehicle: {
    currentOdometer?: number | null
    autoOdometerEnabled?: boolean
    averageDailyKm?: number | null
    odometerBaseValue?: number | null
    odometerBaseDate?: Date | null
  }, fallbackAverageDailyKm?: number | null) {
    const averageDailyKm = vehicle.averageDailyKm ?? fallbackAverageDailyKm ?? null

    if (!vehicle.autoOdometerEnabled || !averageDailyKm || !vehicle.odometerBaseDate) {
      return vehicle.currentOdometer ?? null
    }

    const baseValue = vehicle.odometerBaseValue ?? vehicle.currentOdometer

    if (baseValue === null || baseValue === undefined) {
      return vehicle.currentOdometer ?? null
    }

    const now = new Date()
    const elapsedMs = now.getTime() - vehicle.odometerBaseDate.getTime()
    const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24))
    const projected = baseValue + (elapsedDays * averageDailyKm)

    return Number(projected.toFixed(1))
  }

  calculateOdometerLearning(events: OdometerEvent[]) {
    const ordered = [...events].sort((a, b) => a.date.getTime() - b.date.getTime())
    let totalPerDay = 0
    let totalCount = 0
    let weekdayPerDay = 0
    let weekdayCount = 0
    let weekendPerDay = 0
    let weekendCount = 0
    let outlierCount = 0

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]
      const current = ordered[index]
      const days = Math.max(1, Math.round((current.date.getTime() - previous.date.getTime()) / (1000 * 60 * 60 * 24)))
      const delta = current.odometer - previous.odometer

      if (delta <= 0) {
        continue
      }

      const perDay = delta / days
      const isOutlier = (days <= 1 && delta >= 800) || perDay >= 600

      if (isOutlier) {
        outlierCount += 1
        continue
      }

      totalPerDay += perDay
      totalCount += 1

      const day = current.date.getUTCDay()
      const isWeekend = day === 0 || day === 6

      if (isWeekend) {
        weekendPerDay += perDay
        weekendCount += 1
      } else {
        weekdayPerDay += perDay
        weekdayCount += 1
      }
    }

    const learnedAverageDailyKm = totalCount > 0 ? Number((totalPerDay / totalCount).toFixed(1)) : null
    const learnedWeekdayKm = weekdayCount > 0 ? Number((weekdayPerDay / weekdayCount).toFixed(1)) : null
    const learnedWeekendKm = weekendCount > 0 ? Number((weekendPerDay / weekendCount).toFixed(1)) : null
    const weeklyProjectionKm = Number((((learnedWeekdayKm ?? learnedAverageDailyKm ?? 0) * 5) + ((learnedWeekendKm ?? learnedAverageDailyKm ?? 0) * 2)).toFixed(1))

    return {
      learnedAverageDailyKm,
      learnedWeekdayKm,
      learnedWeekendKm,
      weeklyProjectionKm,
      outlierCount,
    }
  }

  calculateOdometerConfidence(odometerBaseDate?: Date | null) {
    if (!odometerBaseDate) {
      return {
        level: 'LOW' as const,
        score: 0.35,
        daysSinceCalibration: null,
      }
    }

    const elapsedDays = Math.max(0, Math.floor((Date.now() - odometerBaseDate.getTime()) / (1000 * 60 * 60 * 24)))

    if (elapsedDays <= 7) {
      return { level: 'HIGH' as const, score: 0.92, daysSinceCalibration: elapsedDays }
    }

    if (elapsedDays <= 21) {
      return { level: 'MEDIUM' as const, score: 0.68, daysSinceCalibration: elapsedDays }
    }

    return { level: 'LOW' as const, score: 0.4, daysSinceCalibration: elapsedDays }
  }

  calculateDivergencePercent(estimated: number | null, real: number | null) {
    if (estimated === null || estimated === undefined || real === null || real === undefined || real <= 0) {
      return null
    }

    return Number((Math.abs(estimated - real) / real * 100).toFixed(2))
  }

  calculateVehicleHealthBadge(params: {
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
    recalibrationSuggested: boolean
    daysSinceCalibration: number | null
  }) {
    if (params.recalibrationSuggested || params.confidenceLevel === 'LOW' || (params.daysSinceCalibration ?? 0) >= 30) {
      return 'URGENT'
    }

    if (params.confidenceLevel === 'MEDIUM' || (params.daysSinceCalibration ?? 0) >= 14) {
      return 'ATTENTION'
    }

    return 'OK'
  }

  assertOutlierIfNeeded(params: {
    previousOdometer: number | null
    nextOdometer: number
    previousReferenceDate?: Date | null
    confirmOutlier?: boolean
  }) {
    if (params.confirmOutlier || params.previousOdometer === null || params.previousOdometer === undefined) {
      return
    }

    const delta = params.nextOdometer - params.previousOdometer

    if (delta <= 0) {
      return
    }

    const elapsedDays = params.previousReferenceDate
      ? Math.max(1, Math.round((Date.now() - params.previousReferenceDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1

    const perDay = delta / elapsedDays

    if ((elapsedDays <= 1 && delta >= 800) || perDay >= 600) {
      throw new BadRequestException('Detectamos um salto atipico de odometro. Confirme o outlier para continuar.')
    }
  }
}
