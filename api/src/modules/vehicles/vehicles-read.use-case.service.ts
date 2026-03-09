import { Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { FuelRecordsRepository } from 'src/shared/database/repositories/fuel-records.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { VehiclePartsRepository } from 'src/shared/database/repositories/vehicle-parts.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import {
  FuelAnalyticsRecord,
  OdometerEvent,
  VehiclesFuelMaintenanceService,
} from './vehicles-fuel-maintenance.service'

@Injectable()
export class VehiclesReadUseCaseService {
  constructor(
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly fuelRecordsRepo: FuelRecordsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly vehiclePartsRepo: VehiclePartsRepository,
    private readonly vehiclesFuelMaintenanceService: VehiclesFuelMaintenanceService,
  ) {}

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
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
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
      const fuelAnalytics = this.vehiclesFuelMaintenanceService.calculateFuelAnalytics(allVehicleRecords, referenceDailyKm)

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

      const odometerLearning = this.vehiclesFuelMaintenanceService.calculateOdometerLearning(odometerEvents)
      const effectiveCurrentOdometer = this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(
        vehicle,
        odometerLearning.learnedAverageDailyKm,
      )
      const odometerConfidence = this.vehiclesFuelMaintenanceService.calculateOdometerConfidence(vehicle.odometerBaseDate)

      const latestRealOdometer = odometerEvents.length > 0
        ? [...odometerEvents].sort((a, b) => b.date.getTime() - a.date.getTime())[0].odometer
        : null

      const divergencePercent = this.vehiclesFuelMaintenanceService.calculateDivergencePercent(
        effectiveCurrentOdometer,
        latestRealOdometer,
      )

      const recalibrationSuggested = divergencePercent !== null && divergencePercent >= 8
      const healthBadge = this.vehiclesFuelMaintenanceService.calculateVehicleHealthBadge({
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
          currentMonthCost: fuelAnalytics.currentMonthCost,
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
      throw new NotFoundException('Veiculo nao encontrado.')
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
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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

    const odometerLearning = this.vehiclesFuelMaintenanceService.calculateOdometerLearning(odometerEvents)
    const effectiveCurrentOdometer = this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(
      vehicle,
      odometerLearning.learnedAverageDailyKm,
    )
    const odometerConfidence = this.vehiclesFuelMaintenanceService.calculateOdometerConfidence(vehicle.odometerBaseDate)
    const latestRealOdometer = odometerEvents.length > 0
      ? [...odometerEvents].sort((a, b) => b.date.getTime() - a.date.getTime())[0].odometer
      : null
    const divergencePercent = this.vehiclesFuelMaintenanceService.calculateDivergencePercent(
      effectiveCurrentOdometer,
      latestRealOdometer,
    )
    const recalibrationSuggested = divergencePercent !== null && divergencePercent >= 8
    const healthBadge = this.vehiclesFuelMaintenanceService.calculateVehicleHealthBadge({
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
    const fuelAnalytics = this.vehiclesFuelMaintenanceService.calculateFuelAnalytics(allVehicleRecords, vehicle.averageDailyKm)

    return {
      ...vehicle,
      effectiveCurrentOdometer,
      fuelStats: {
        recordsCount: allVehicleRecords.length,
        totalCost: Number(fuelTotalCost.toFixed(2)),
        totalLiters: Number(fuelTotalLiters.toFixed(2)),
        currentMonthCost: fuelAnalytics.currentMonthCost,
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

  async getVehicleOdometerEvents(userId: string, vehicleId: string): Promise<OdometerEvent[]> {
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
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
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
}
