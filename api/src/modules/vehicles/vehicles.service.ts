import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/database/prisma.service'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { FuelRecordsRepository } from 'src/shared/database/repositories/fuel-records.repository'
import { FuelStatsSnapshotsRepository } from 'src/shared/database/repositories/fuel-stats-snapshots.repository'
import { FuelTripSegmentsRepository } from 'src/shared/database/repositories/fuel-trip-segments.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { VehiclePartsRepository } from 'src/shared/database/repositories/vehicle-parts.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { CreateVehicleUsageEventDto } from './dto/create-vehicle-usage-event.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'

type OdometerEvent = {
  date: Date
  odometer: number
  source: 'FUEL' | 'MAINTENANCE' | 'PART'
}

type FuelAnalyticsRecord = {
  id: string
  date: Date
  odometer: number
  liters: number
  totalCost: number
  fillType: 'FULL' | 'PARTIAL'
  firstPumpClick: boolean
  source: 'ACCOUNT' | 'CARD'
}

type ComputedFuelSegment = {
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
export class VehiclesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly fuelRecordsRepo: FuelRecordsRepository,
    private readonly fuelTripSegmentsRepo: FuelTripSegmentsRepository,
    private readonly fuelStatsSnapshotsRepo: FuelStatsSnapshotsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly vehiclePartsRepo: VehiclePartsRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly categoriesRepo: CategoriesRepository,
  ) {}

  create(userId: string, createVehicleDto: CreateVehicleDto) {
    const now = new Date()

    return this.vehiclesRepo.create({
      data: {
        userId,
        name: createVehicleDto.name,
        model: createVehicleDto.model,
        plate: createVehicleDto.plate,
        photoUrl: createVehicleDto.photoUrl,
        currentOdometer: createVehicleDto.currentOdometer,
        autoOdometerEnabled: createVehicleDto.autoOdometerEnabled ?? false,
        averageDailyKm: createVehicleDto.averageDailyKm,
        odometerBaseValue: createVehicleDto.odometerBaseValue ?? createVehicleDto.currentOdometer,
        odometerBaseDate: createVehicleDto.odometerBaseDate
          ? this.toUTCDate(createVehicleDto.odometerBaseDate)
          : createVehicleDto.currentOdometer !== undefined
            ? now
            : undefined,
        fuelType: createVehicleDto.fuelType,
      },
    })
  }

  async findAll(userId: string) {
    const vehicles = await this.vehiclesRepo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const records = await this.fuelRecordsRepo.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    const maintenanceTransactions = await this.transactionsRepo.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        maintenanceVehicleId: {
          not: null,
        },
      },
      select: {
        id: true,
        maintenanceVehicleId: true,
        maintenanceOdometer: true,
        value: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    })

    const cardFuelPurchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        fuelVehicleId: {
          not: null,
        },
        fuelOdometer: {
          not: null,
        },
        fuelLiters: {
          not: null,
        },
        fuelPricePerLiter: {
          not: null,
        },
      },
      orderBy: { purchaseDate: 'asc' },
      select: {
        id: true,
        fuelVehicleId: true,
        fuelOdometer: true,
        fuelLiters: true,
        fuelPricePerLiter: true,
        fuelFillType: true,
        fuelFirstPumpClick: true,
        amount: true,
        purchaseDate: true,
      },
    })

    const maintenancePurchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        maintenanceVehicleId: {
          not: null,
        },
      },
      select: {
        id: true,
        maintenanceVehicleId: true,
        maintenanceOdometer: true,
        amount: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'asc' },
    })

    const normalizedCardFuelRecords = cardFuelPurchases
      .filter((purchase) => purchase.fuelVehicleId)
      .map((purchase) => ({
        id: purchase.id,
        vehicleId: purchase.fuelVehicleId!,
        odometer: purchase.fuelOdometer!,
        liters: purchase.fuelLiters!,
        pricePerLiter: purchase.fuelPricePerLiter!,
        fillType: purchase.fuelFillType,
        firstPumpClick: purchase.fuelFirstPumpClick,
        totalCost: purchase.amount,
        date: purchase.purchaseDate,
      }))

    return Promise.all(vehicles.map(async (vehicle) => {
      const transactionFuelRecords = records
        .filter((record) => record.vehicleId === vehicle.id)
        .map((record) => ({
        id: record.id,
        odometer: record.odometer,
        liters: record.liters,
        pricePerLiter: record.pricePerLiter,
        totalCost: record.totalCost,
        date: record.createdAt,
        fillType: record.fillType,
        firstPumpClick: record.firstPumpClick,
        source: 'ACCOUNT' as const,
      }))
      const allVehicleRecords: FuelAnalyticsRecord[] = [
        ...transactionFuelRecords,
        ...normalizedCardFuelRecords
          .filter((record) => record.vehicleId === vehicle.id)
          .map((record) => ({
            id: `ccp-${record.id}`,
            odometer: record.odometer,
            liters: record.liters,
            totalCost: record.totalCost,
            date: record.date,
            fillType: record.fillType,
            firstPumpClick: record.firstPumpClick,
            source: 'CARD' as const,
          })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime())

      const maintenanceByTransaction = maintenanceTransactions
        .filter((transaction) => transaction.maintenanceVehicleId === vehicle.id)
        .map((transaction) => ({
          amount: transaction.value,
          odometer: transaction.maintenanceOdometer,
          date: transaction.date,
        }))

      const maintenanceByPurchase = maintenancePurchases
        .filter((purchase) => purchase.maintenanceVehicleId === vehicle.id)
        .map((purchase) => ({
          amount: purchase.amount,
          odometer: purchase.maintenanceOdometer,
          date: purchase.purchaseDate,
        }))

      const allMaintenances = [...maintenanceByTransaction, ...maintenanceByPurchase]
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      const totalMaintenanceCost = allMaintenances.reduce((acc, item) => acc + item.amount, 0)
      const totalCost = allVehicleRecords.reduce((acc, record) => acc + record.totalCost, 0)
      const totalLiters = allVehicleRecords.reduce((acc, record) => acc + record.liters, 0)
      const averagePricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0

      const referenceDailyKm = vehicle.averageDailyKm ?? null
      const fuelAnalytics = this.calculateFuelAnalytics(allVehicleRecords, referenceDailyKm)

      const now = new Date()
      try {
        await this.persistFuelAnalyticsSnapshot({
          userId,
          vehicleId: vehicle.id,
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
          segments: fuelAnalytics.segments,
          stats: {
            officialConsumptionKmPerLiter: fuelAnalytics.officialConsumptionKmPerLiter,
            officialCostPerKm: fuelAnalytics.officialCostPerKm,
            officialDistanceKm: fuelAnalytics.officialDistanceKm,
            officialLiters: fuelAnalytics.officialLiters,
            currentMonthCost: fuelAnalytics.currentMonthCost,
            projectedMonthCost: fuelAnalytics.projectedMonthCost,
            nextRefuelInDays: fuelAnalytics.nextRefuelInDays,
            nextRefuelAtKm: fuelAnalytics.nextRefuelAtKm,
            lastFuelRecordId: allVehicleRecords.at(-1)?.source === 'ACCOUNT' ? allVehicleRecords.at(-1)?.id : null,
          },
        })
      } catch {
      }

      const odometerEvents: OdometerEvent[] = [
        ...allVehicleRecords.map((record) => ({
          date: record.date,
          odometer: record.odometer,
          source: 'FUEL' as const,
        })),
        ...allMaintenances
          .filter((item) => item.odometer !== null && item.odometer !== undefined)
          .map((item) => ({
            date: item.date,
            odometer: item.odometer as number,
            source: 'MAINTENANCE' as const,
          })),
      ]

      const odometerLearning = this.calculateOdometerLearning(odometerEvents)
      const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(
        vehicle,
        odometerLearning.learnedAverageDailyKm,
      )
      const odometerConfidence = this.calculateOdometerConfidence(vehicle.odometerBaseDate)

      const latestRealOdometer = odometerEvents.length > 0
        ? [...odometerEvents].sort((a, b) => b.date.getTime() - a.date.getTime())[0].odometer
        : null

      const divergencePercent = this.calculateDivergencePercent(
        effectiveCurrentOdometer,
        latestRealOdometer,
      )

      const recalibrationSuggested = divergencePercent !== null && divergencePercent >= 8
      const healthBadge = this.calculateVehicleHealthBadge({
        confidenceLevel: odometerConfidence.level,
        recalibrationSuggested,
        daysSinceCalibration: odometerConfidence.daysSinceCalibration,
      })

      return {
        ...vehicle,
        effectiveCurrentOdometer,
        fuelStats: {
          recordsCount: allVehicleRecords.length,
          totalCost: Number(totalCost.toFixed(2)),
          totalLiters: Number(totalLiters.toFixed(2)),
          averagePricePerLiter: Number(averagePricePerLiter.toFixed(2)),
          averageConsumptionKmPerLiter: fuelAnalytics.officialConsumptionKmPerLiter,
          costPerKm: fuelAnalytics.officialCostPerKm,
          costPer1000Km: fuelAnalytics.officialCostPerKm !== null ? Number((fuelAnalytics.officialCostPerKm * 1000).toFixed(2)) : null,
          officialDistanceKm: fuelAnalytics.officialDistanceKm,
          officialLiters: fuelAnalytics.officialLiters,
          projectedMonthCost: fuelAnalytics.projectedMonthCost,
          nextRefuelInDays: fuelAnalytics.nextRefuelInDays,
          nextRefuelAtKm: fuelAnalytics.nextRefuelAtKm,
          lastOdometer: allVehicleRecords.at(-1)?.odometer ?? null,
        },
        maintenanceStats: {
          recordsCount: allMaintenances.length,
          totalCost: Number(totalMaintenanceCost.toFixed(2)),
          lastMaintenanceDate: allMaintenances.at(-1)?.date ?? null,
        },
        odometerConfidence,
        odometerLearning,
        latestRealOdometer,
        divergencePercent,
        recalibrationSuggested,
        healthBadge,
      }
    }))
  }

  async findOne(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesRepo.findFirst({
      where: { id: vehicleId, userId },
    })

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.')
    }

    const records = await this.fuelRecordsRepo.findMany({
      where: { userId, vehicleId },
      include: {
        transaction: {
          select: {
            id: true,
            name: true,
            date: true,
            value: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const cardFuelPurchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        fuelVehicleId: vehicleId,
        fuelOdometer: {
          not: null,
        },
        fuelLiters: {
          not: null,
        },
        fuelPricePerLiter: {
          not: null,
        },
      },
      orderBy: { purchaseDate: 'desc' },
      select: {
        id: true,
        fuelVehicleId: true,
        fuelOdometer: true,
        fuelLiters: true,
        fuelPricePerLiter: true,
        fuelFillType: true,
        fuelFirstPumpClick: true,
        amount: true,
        purchaseDate: true,
        description: true,
      },
    })

    const normalizedCardFuelRecords = cardFuelPurchases.map((purchase) => ({
      id: `ccp-${purchase.id}`,
      userId,
      vehicleId,
      transactionId: purchase.id,
      odometer: purchase.fuelOdometer!,
      liters: purchase.fuelLiters!,
      fillType: purchase.fuelFillType,
      firstPumpClick: purchase.fuelFirstPumpClick,
      pricePerLiter: purchase.fuelPricePerLiter!,
      totalCost: purchase.amount,
      createdAt: purchase.purchaseDate,
      transaction: {
        id: purchase.id,
        name: purchase.description,
        date: purchase.purchaseDate,
        value: purchase.amount,
      },
    }))

    const mergedRecords = [...records, ...normalizedCardFuelRecords]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const maintenanceTransactions = await this.transactionsRepo.findMany({
      where: {
        userId,
        maintenanceVehicleId: vehicleId,
        type: 'EXPENSE',
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const maintenancePurchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        maintenanceVehicleId: vehicleId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        creditCard: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    })

    const maintenanceRecords = [
      ...maintenanceTransactions.map((transaction) => ({
        id: `tx-${transaction.id}`,
        source: 'ACCOUNT' as const,
        sourceId: transaction.id,
        title: transaction.name,
        amount: transaction.value,
        date: transaction.date,
        odometer: transaction.maintenanceOdometer,
        category: transaction.category,
        sourceLabel: transaction.bankAccount.name,
      })),
      ...maintenancePurchases.map((purchase) => ({
        id: `cc-${purchase.id}`,
        source: 'CARD' as const,
        sourceId: purchase.id,
        title: purchase.description,
        amount: purchase.amount,
        date: purchase.purchaseDate,
        odometer: purchase.maintenanceOdometer,
        category: purchase.category,
        sourceLabel: purchase.creditCard.name,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime())

    const parts = await this.vehiclePartsRepo.findMany({
      where: {
        userId,
        vehicleId,
      },
      orderBy: { installedAt: 'desc' },
    })

    const odometerEvents: OdometerEvent[] = [
      ...mergedRecords.map((record) => ({
        date: record.createdAt,
        odometer: record.odometer,
        source: 'FUEL' as const,
      })),
      ...maintenanceRecords
        .filter((maintenance) => maintenance.odometer !== null && maintenance.odometer !== undefined)
        .map((maintenance) => ({
          date: maintenance.date,
          odometer: maintenance.odometer as number,
          source: 'MAINTENANCE' as const,
        })),
      ...parts
        .filter((part) => part.installedOdometer !== null && part.installedOdometer !== undefined)
        .map((part) => ({
          date: part.installedAt,
          odometer: part.installedOdometer as number,
          source: 'PART' as const,
        })),
    ]

    const odometerLearning = this.calculateOdometerLearning(odometerEvents)
    const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(
      vehicle,
      odometerLearning.learnedAverageDailyKm,
    )
    const odometerConfidence = this.calculateOdometerConfidence(vehicle.odometerBaseDate)
    const latestRealOdometer = odometerEvents.length > 0
      ? [...odometerEvents].sort((a, b) => b.date.getTime() - a.date.getTime())[0].odometer
      : null
    const divergencePercent = this.calculateDivergencePercent(
      effectiveCurrentOdometer,
      latestRealOdometer,
    )
    const recalibrationSuggested = divergencePercent !== null && divergencePercent >= 8
    const healthBadge = this.calculateVehicleHealthBadge({
      confidenceLevel: odometerConfidence.level,
      recalibrationSuggested,
      daysSinceCalibration: odometerConfidence.daysSinceCalibration,
    })

    const allVehicleRecords: FuelAnalyticsRecord[] = mergedRecords
      .map((record) => ({
        id: record.id,
        date: record.createdAt,
        odometer: record.odometer,
        liters: record.liters,
        totalCost: record.totalCost,
        fillType: (record as any).fillType ?? 'PARTIAL',
        firstPumpClick: !!(record as any).firstPumpClick,
        source: String(record.id).startsWith('ccp-') ? ('CARD' as const) : ('ACCOUNT' as const),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const fuelTotalCost = allVehicleRecords.reduce((acc, item) => acc + item.totalCost, 0)
    const fuelTotalLiters = allVehicleRecords.reduce((acc, item) => acc + item.liters, 0)
    const fuelAveragePricePerLiter = fuelTotalLiters > 0 ? fuelTotalCost / fuelTotalLiters : 0
    const fuelAnalytics = this.calculateFuelAnalytics(allVehicleRecords, vehicle.averageDailyKm)

    const now = new Date()
    try {
      await this.persistFuelAnalyticsSnapshot({
        userId,
        vehicleId,
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        segments: fuelAnalytics.segments,
        stats: {
          officialConsumptionKmPerLiter: fuelAnalytics.officialConsumptionKmPerLiter,
          officialCostPerKm: fuelAnalytics.officialCostPerKm,
          officialDistanceKm: fuelAnalytics.officialDistanceKm,
          officialLiters: fuelAnalytics.officialLiters,
          currentMonthCost: fuelAnalytics.currentMonthCost,
          projectedMonthCost: fuelAnalytics.projectedMonthCost,
          nextRefuelInDays: fuelAnalytics.nextRefuelInDays,
          nextRefuelAtKm: fuelAnalytics.nextRefuelAtKm,
          lastFuelRecordId: allVehicleRecords.at(-1)?.source === 'ACCOUNT' ? allVehicleRecords.at(-1)?.id : null,
        },
      })
    } catch {
    }

    return {
      ...vehicle,
      effectiveCurrentOdometer,
      fuelStats: {
        recordsCount: allVehicleRecords.length,
        totalCost: Number(fuelTotalCost.toFixed(2)),
        totalLiters: Number(fuelTotalLiters.toFixed(2)),
        averagePricePerLiter: Number(fuelAveragePricePerLiter.toFixed(2)),
        averageConsumptionKmPerLiter: fuelAnalytics.officialConsumptionKmPerLiter,
        costPerKm: fuelAnalytics.officialCostPerKm,
        costPer1000Km: fuelAnalytics.officialCostPerKm !== null ? Number((fuelAnalytics.officialCostPerKm * 1000).toFixed(2)) : null,
        officialDistanceKm: fuelAnalytics.officialDistanceKm,
        officialLiters: fuelAnalytics.officialLiters,
        projectedMonthCost: fuelAnalytics.projectedMonthCost,
        nextRefuelInDays: fuelAnalytics.nextRefuelInDays,
        nextRefuelAtKm: fuelAnalytics.nextRefuelAtKm,
        lastOdometer: allVehicleRecords.at(-1)?.odometer ?? null,
      },
      odometerConfidence,
      odometerLearning,
      latestRealOdometer,
      divergencePercent,
      recalibrationSuggested,
      healthBadge,
      fuelRecords: mergedRecords,
      maintenances: maintenanceRecords,
      parts,
    }
  }

  private calculateFuelAnalytics(records: FuelAnalyticsRecord[], averageDailyKm?: number | null) {
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

  private async persistFuelAnalyticsSnapshot(params: {
    userId: string
    vehicleId: string
    year: number
    month: number
    segments: ComputedFuelSegment[]
    stats: {
      officialConsumptionKmPerLiter: number | null
      officialCostPerKm: number | null
      officialDistanceKm: number
      officialLiters: number
      currentMonthCost: number
      projectedMonthCost: number | null
      nextRefuelInDays: number | null
      nextRefuelAtKm: number | null
      lastFuelRecordId?: string | null
    }
  }) {
    await this.fuelTripSegmentsRepo.deleteMany({
      where: {
        userId: params.userId,
        vehicleId: params.vehicleId,
      },
    })

    const accountSegments = params.segments.filter(
      (segment) => !segment.startFuelRecordId.startsWith('ccp-') && !segment.endFuelRecordId.startsWith('ccp-'),
    )

    if (accountSegments.length > 0) {
      await this.fuelTripSegmentsRepo.createMany({
        data: accountSegments.map((segment) => ({
          userId: params.userId,
          vehicleId: params.vehicleId,
          startFuelRecordId: segment.startFuelRecordId,
          endFuelRecordId: segment.endFuelRecordId,
          startDate: segment.startDate,
          endDate: segment.endDate,
          startOdometer: segment.startOdometer,
          endOdometer: segment.endOdometer,
          distanceKm: segment.distanceKm,
          litersConsumed: segment.litersConsumed,
          totalCost: segment.totalCost,
          consumptionKmPerLiter: segment.consumptionKmPerLiter,
          costPerKm: segment.costPerKm,
          confidence: segment.confidence,
        })),
      })
    }

    await this.fuelStatsSnapshotsRepo.upsert({
      where: {
        userId_vehicleId_year_month: {
          userId: params.userId,
          vehicleId: params.vehicleId,
          year: params.year,
          month: params.month,
        },
      },
      create: {
        userId: params.userId,
        vehicleId: params.vehicleId,
        year: params.year,
        month: params.month,
        officialConsumptionKmPerLiter: params.stats.officialConsumptionKmPerLiter,
        officialCostPerKm: params.stats.officialCostPerKm,
        officialDistanceKm: params.stats.officialDistanceKm,
        officialLiters: params.stats.officialLiters,
        currentMonthCost: params.stats.currentMonthCost,
        projectedMonthCost: params.stats.projectedMonthCost,
        nextRefuelInDays: params.stats.nextRefuelInDays,
        nextRefuelAtKm: params.stats.nextRefuelAtKm,
        lastFuelRecordId: params.stats.lastFuelRecordId ?? null,
      },
      update: {
        officialConsumptionKmPerLiter: params.stats.officialConsumptionKmPerLiter,
        officialCostPerKm: params.stats.officialCostPerKm,
        officialDistanceKm: params.stats.officialDistanceKm,
        officialLiters: params.stats.officialLiters,
        currentMonthCost: params.stats.currentMonthCost,
        projectedMonthCost: params.stats.projectedMonthCost,
        nextRefuelInDays: params.stats.nextRefuelInDays,
        nextRefuelAtKm: params.stats.nextRefuelAtKm,
        lastFuelRecordId: params.stats.lastFuelRecordId ?? null,
      },
    })
  }

  async update(userId: string, vehicleId: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesRepo.findFirst({
      where: { id: vehicleId, userId },
      select: {
        id: true,
        currentOdometer: true,
        autoOdometerEnabled: true,
        averageDailyKm: true,
        odometerBaseValue: true,
        odometerBaseDate: true,
      },
    })

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.')
    }

    const historicalOdometerEvents = await this.getVehicleOdometerEvents(userId, vehicleId)
    const learning = this.calculateOdometerLearning(historicalOdometerEvents)
    const effectiveBeforeUpdate = this.calculateEffectiveCurrentOdometer(
      vehicle,
      learning.learnedAverageDailyKm,
    )

    if (updateVehicleDto.currentOdometer !== undefined) {
      this.assertOutlierIfNeeded({
        previousOdometer: effectiveBeforeUpdate,
        nextOdometer: updateVehicleDto.currentOdometer,
        previousReferenceDate: vehicle.odometerBaseDate,
        confirmOutlier: updateVehicleDto.confirmOutlier,
      })
    }

    const nextData: Prisma.VehicleUncheckedUpdateInput = {
      name: updateVehicleDto.name,
      model: updateVehicleDto.model,
      plate: updateVehicleDto.plate,
      photoUrl: updateVehicleDto.photoUrl,
      currentOdometer: updateVehicleDto.currentOdometer,
      fuelType: updateVehicleDto.fuelType,
      autoOdometerEnabled: updateVehicleDto.autoOdometerEnabled,
      averageDailyKm: updateVehicleDto.averageDailyKm,
      odometerBaseValue: updateVehicleDto.odometerBaseValue,
      odometerBaseDate: updateVehicleDto.odometerBaseDate
        ? this.toUTCDate(updateVehicleDto.odometerBaseDate)
        : undefined,
    }

    if (updateVehicleDto.currentOdometer !== undefined) {
      nextData.odometerBaseValue = updateVehicleDto.currentOdometer
      nextData.odometerBaseDate = new Date()
    }

    if (updateVehicleDto.autoOdometerEnabled === true && !nextData.odometerBaseValue) {
      const baselineFromVehicle = vehicle.currentOdometer ?? this.calculateEffectiveCurrentOdometer(vehicle)

      if (baselineFromVehicle !== null && baselineFromVehicle !== undefined) {
        nextData.odometerBaseValue = baselineFromVehicle
        nextData.odometerBaseDate = new Date()
      }
    }

    if (
      updateVehicleDto.autoOdometerEnabled === true
      && updateVehicleDto.averageDailyKm === undefined
      && learning.learnedAverageDailyKm !== null
    ) {
      nextData.averageDailyKm = learning.learnedAverageDailyKm
    }

    const updatedVehicle = await this.vehiclesRepo.update({
      where: { id: vehicleId },
      data: nextData,
    })

    if (updateVehicleDto.currentOdometer !== undefined) {
      await this.logAudit(userId, vehicleId, {
        eventType: 'ODOMETER_UPDATED',
        previousValue: vehicle.currentOdometer,
        newValue: updateVehicleDto.currentOdometer,
        metadata: {
          effectiveBeforeUpdate,
          confirmOutlier: !!updateVehicleDto.confirmOutlier,
        },
      })
    }

    if (updateVehicleDto.autoOdometerEnabled !== undefined) {
      await this.logAudit(userId, vehicleId, {
        eventType: 'AUTO_ODOMETER_TOGGLED',
        previousValue: vehicle.autoOdometerEnabled,
        newValue: updateVehicleDto.autoOdometerEnabled,
        metadata: {
          averageDailyKm: nextData.averageDailyKm ?? vehicle.averageDailyKm,
          learnedAverageDailyKm: learning.learnedAverageDailyKm,
        },
      })
    }

    return updatedVehicle
  }

  async createPart(userId: string, vehicleId: string, createVehiclePartDto: CreateVehiclePartDto) {
    const vehicle = await this.vehiclesRepo.findFirst({
      where: { id: vehicleId, userId },
      select: {
        id: true,
        name: true,
        currentOdometer: true,
        autoOdometerEnabled: true,
        averageDailyKm: true,
        odometerBaseValue: true,
        odometerBaseDate: true,
      },
    })

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.')
    }

    const bankAccount = await this.bankAccountsRepo.findFirst({
      where: {
        id: createVehiclePartDto.bankAccountId,
        userId,
      },
      select: { id: true },
    })

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada.')
    }

    if (createVehiclePartDto.categoryId) {
      const category = await this.categoriesRepo.findFirst({
        where: {
          id: createVehiclePartDto.categoryId,
          userId,
          type: 'EXPENSE',
        },
        select: { id: true },
      })

      if (!category) {
        throw new NotFoundException('Categoria de despesa não encontrada.')
      }
    }

    if (createVehiclePartDto.totalCost <= 0) {
      throw new BadRequestException('Custo total inválido.')
    }

    const installedAt = this.toUTCDate(createVehiclePartDto.installedAt)
    const description = `Peça ${createVehiclePartDto.name} - ${vehicle.name}`
    const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(vehicle)

    if (createVehiclePartDto.installedOdometer !== undefined && createVehiclePartDto.installedOdometer !== null) {
      this.assertOutlierIfNeeded({
        previousOdometer: effectiveCurrentOdometer,
        nextOdometer: createVehiclePartDto.installedOdometer,
        previousReferenceDate: vehicle.odometerBaseDate,
        confirmOutlier: createVehiclePartDto.confirmOutlier,
      })
    }

    return this.prismaService.$transaction(async (prisma) => {
      const createdPart = await prisma.vehiclePart.create({
        data: {
          userId,
          vehicleId,
          name: createVehiclePartDto.name,
          brand: createVehiclePartDto.brand,
          quantity: createVehiclePartDto.quantity ?? 1,
          totalCost: createVehiclePartDto.totalCost,
          installedAt,
          installedOdometer: createVehiclePartDto.installedOdometer,
          lifetimeKm: createVehiclePartDto.lifetimeKm,
          nextReplacementOdometer: createVehiclePartDto.nextReplacementOdometer,
          notes: createVehiclePartDto.notes,
        },
      })

      await prisma.transaction.create({
        data: {
          userId,
          bankAccountId: createVehiclePartDto.bankAccountId,
          categoryId: createVehiclePartDto.categoryId,
          maintenanceVehicleId: vehicleId,
          maintenanceOdometer: createVehiclePartDto.installedOdometer,
          name: description,
          value: createVehiclePartDto.totalCost,
          date: installedAt,
          type: 'EXPENSE',
        },
      })

      if (
        createVehiclePartDto.installedOdometer !== undefined
        && createVehiclePartDto.installedOdometer !== null
        && (
          effectiveCurrentOdometer === null
          || effectiveCurrentOdometer === undefined
          || createVehiclePartDto.installedOdometer > effectiveCurrentOdometer
        )
      ) {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            currentOdometer: createVehiclePartDto.installedOdometer,
            odometerBaseValue: createVehiclePartDto.installedOdometer,
            odometerBaseDate: installedAt,
          },
        })
      }

      await this.logAudit(userId, vehicleId, {
        eventType: 'PART_CREATED',
        previousValue: null,
        newValue: createVehiclePartDto.name,
        metadata: {
          totalCost: createVehiclePartDto.totalCost,
          installedOdometer: createVehiclePartDto.installedOdometer,
        },
      })

      if (createVehiclePartDto.totalCost >= 1000) {
        await this.logAudit(userId, vehicleId, {
          eventType: 'HIGH_COST_RECORDED',
          previousValue: null,
          newValue: createVehiclePartDto.totalCost,
          metadata: {
            source: 'PART',
            name: createVehiclePartDto.name,
          },
        })
      }

      return createdPart
    })
  }

  private toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  async recalibrateNow(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesRepo.findFirst({
      where: { id: vehicleId, userId },
      select: {
        id: true,
        currentOdometer: true,
        autoOdometerEnabled: true,
        averageDailyKm: true,
        odometerBaseValue: true,
        odometerBaseDate: true,
      },
    })

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.')
    }

    const events = await this.getVehicleOdometerEvents(userId, vehicleId)
    const learning = this.calculateOdometerLearning(events)
    const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(
      vehicle,
      learning.learnedAverageDailyKm,
    )

    if (effectiveCurrentOdometer === null || effectiveCurrentOdometer === undefined) {
      throw new BadRequestException('Sem referência de odômetro para recalibrar.')
    }

    const updated = await this.vehiclesRepo.update({
      where: { id: vehicleId },
      data: {
        currentOdometer: effectiveCurrentOdometer,
        odometerBaseValue: effectiveCurrentOdometer,
        odometerBaseDate: new Date(),
        averageDailyKm: vehicle.averageDailyKm ?? learning.learnedAverageDailyKm ?? undefined,
      },
    })

    await this.logAudit(userId, vehicleId, {
      eventType: 'ODOMETER_RECALIBRATED_NOW',
      previousValue: vehicle.currentOdometer,
      newValue: effectiveCurrentOdometer,
      metadata: {
        learnedAverageDailyKm: learning.learnedAverageDailyKm,
      },
    })

    return updated
  }

  async trackUsageEvent(userId: string, createVehicleUsageEventDto: CreateVehicleUsageEventDto) {
    if (createVehicleUsageEventDto.vehicleId) {
      await this.validateOwnership(userId, createVehicleUsageEventDto.vehicleId)
    }

    return this.prismaService.vehicleUsageEvent.create({
      data: {
        userId,
        vehicleId: createVehicleUsageEventDto.vehicleId,
        eventName: createVehicleUsageEventDto.eventName,
        screen: createVehicleUsageEventDto.screen,
        metadata: createVehicleUsageEventDto.metadata,
      },
    })
  }

  async findAuditLogs(userId: string, vehicleId: string, limit: number) {
    await this.validateOwnership(userId, vehicleId)

    return this.prismaService.vehicleAuditLog.findMany({
      where: {
        userId,
        vehicleId,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit || 20, 1), 100),
    })
  }

  private calculateEffectiveCurrentOdometer(vehicle: {
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

  private calculateOdometerLearning(events: OdometerEvent[]) {
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

  private calculateOdometerConfidence(odometerBaseDate?: Date | null) {
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

  private calculateDivergencePercent(estimated: number | null, real: number | null) {
    if (estimated === null || estimated === undefined || real === null || real === undefined || real <= 0) {
      return null
    }

    return Number((Math.abs(estimated - real) / real * 100).toFixed(2))
  }

  private calculateVehicleHealthBadge(params: {
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

  private assertOutlierIfNeeded(params: {
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
      throw new BadRequestException('Detectamos um salto atípico de odômetro. Confirme o outlier para continuar.')
    }
  }

  private async getVehicleOdometerEvents(userId: string, vehicleId: string): Promise<OdometerEvent[]> {
    const fuelRecords = await this.fuelRecordsRepo.findMany({
      where: { userId, vehicleId },
      select: {
        odometer: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const maintenanceTransactions = await this.transactionsRepo.findMany({
      where: {
        userId,
        maintenanceVehicleId: vehicleId,
        maintenanceOdometer: { not: null },
      },
      select: {
        maintenanceOdometer: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    })

    const maintenancePurchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        maintenanceVehicleId: vehicleId,
        maintenanceOdometer: { not: null },
      },
      select: {
        maintenanceOdometer: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'asc' },
    })

    return [
      ...fuelRecords.map((record) => ({
        date: record.createdAt,
        odometer: record.odometer,
        source: 'FUEL' as const,
      })),
      ...maintenanceTransactions.map((transaction) => ({
        date: transaction.date,
        odometer: transaction.maintenanceOdometer as number,
        source: 'MAINTENANCE' as const,
      })),
      ...maintenancePurchases.map((purchase) => ({
        date: purchase.purchaseDate,
        odometer: purchase.maintenanceOdometer as number,
        source: 'MAINTENANCE' as const,
      })),
    ]
  }

  private async logAudit(
    userId: string,
    vehicleId: string,
    params: {
      eventType: string
      previousValue: unknown
      newValue: unknown
      metadata?: Record<string, unknown>
    },
  ) {
    return this.prismaService.vehicleAuditLog.create({
      data: {
        userId,
        vehicleId,
        eventType: params.eventType,
        previousValue: params.previousValue === undefined ? null : String(params.previousValue),
        newValue: params.newValue === undefined ? null : String(params.newValue),
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  }

  private async validateOwnership(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesRepo.findFirst({
      where: { id: vehicleId, userId },
      select: { id: true },
    })

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.')
    }
  }
}
