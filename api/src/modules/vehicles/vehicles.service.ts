import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/database/prisma.service'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { FuelRecordsRepository } from 'src/shared/database/repositories/fuel-records.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { VehiclePartsRepository } from 'src/shared/database/repositories/vehicle-parts.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly fuelRecordsRepo: FuelRecordsRepository,
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
        vehicleId: purchase.fuelVehicleId!,
        odometer: purchase.fuelOdometer!,
        liters: purchase.fuelLiters!,
        pricePerLiter: purchase.fuelPricePerLiter!,
        totalCost: purchase.amount,
        date: purchase.purchaseDate,
      }))

    return vehicles.map((vehicle) => {
      const transactionFuelRecords = records
        .filter((record) => record.vehicleId === vehicle.id)
        .map((record) => ({
        odometer: record.odometer,
        liters: record.liters,
        pricePerLiter: record.pricePerLiter,
        totalCost: record.totalCost,
        date: record.createdAt,
      }))
      const allVehicleRecords = [
        ...transactionFuelRecords,
        ...normalizedCardFuelRecords.filter((record) => record.vehicleId === vehicle.id),
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

      let averageConsumptionKmPerLiter: number | null = null
      let costPerKm: number | null = null

      if (allVehicleRecords.length >= 2) {
        const first = allVehicleRecords[0]
        const last = allVehicleRecords[allVehicleRecords.length - 1]
        const distance = last.odometer - first.odometer

        if (distance > 0 && totalLiters > 0) {
          averageConsumptionKmPerLiter = Number((distance / totalLiters).toFixed(2))
          costPerKm = Number((totalCost / distance).toFixed(2))
        }
      }

      const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(vehicle)

      return {
        ...vehicle,
        effectiveCurrentOdometer,
        fuelStats: {
          recordsCount: allVehicleRecords.length,
          totalCost: Number(totalCost.toFixed(2)),
          totalLiters: Number(totalLiters.toFixed(2)),
          averagePricePerLiter: Number(averagePricePerLiter.toFixed(2)),
          averageConsumptionKmPerLiter,
          costPerKm,
          lastOdometer: allVehicleRecords.at(-1)?.odometer ?? null,
        },
        maintenanceStats: {
          recordsCount: allMaintenances.length,
          totalCost: Number(totalMaintenanceCost.toFixed(2)),
          lastMaintenanceDate: allMaintenances.at(-1)?.date ?? null,
        },
      }
    })
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

    return {
      ...vehicle,
      effectiveCurrentOdometer: this.calculateEffectiveCurrentOdometer(vehicle),
      fuelRecords: mergedRecords,
      maintenances: maintenanceRecords,
      parts,
    }
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

    return this.vehiclesRepo.update({
      where: { id: vehicleId },
      data: nextData,
    })
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

      const effectiveCurrentOdometer = this.calculateEffectiveCurrentOdometer(vehicle)

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

      return createdPart
    })
  }

  private toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  private calculateEffectiveCurrentOdometer(vehicle: {
    currentOdometer?: number | null
    autoOdometerEnabled?: boolean
    averageDailyKm?: number | null
    odometerBaseValue?: number | null
    odometerBaseDate?: Date | null
  }) {
    if (!vehicle.autoOdometerEnabled || !vehicle.averageDailyKm || !vehicle.odometerBaseDate) {
      return vehicle.currentOdometer ?? null
    }

    const baseValue = vehicle.odometerBaseValue ?? vehicle.currentOdometer

    if (baseValue === null || baseValue === undefined) {
      return vehicle.currentOdometer ?? null
    }

    const now = new Date()
    const elapsedMs = now.getTime() - vehicle.odometerBaseDate.getTime()
    const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24))
    const projected = baseValue + (elapsedDays * vehicle.averageDailyKm)

    return Number(projected.toFixed(1))
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
