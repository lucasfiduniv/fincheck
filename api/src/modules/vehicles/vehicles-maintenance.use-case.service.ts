import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/database/prisma.service'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { CreateVehicleUsageEventDto } from './dto/create-vehicle-usage-event.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { VehiclesFuelMaintenanceService } from './vehicles-fuel-maintenance.service'
import { VehiclesReadUseCaseService } from './vehicles-read.use-case.service'

@Injectable()
export class VehiclesMaintenanceUseCaseService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly vehiclesFuelMaintenanceService: VehiclesFuelMaintenanceService,
    private readonly vehiclesReadUseCaseService: VehiclesReadUseCaseService,
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
          ? this.vehiclesFuelMaintenanceService.toUTCDate(createVehicleDto.odometerBaseDate)
          : createVehicleDto.currentOdometer !== undefined
            ? now
            : undefined,
        fuelType: createVehicleDto.fuelType,
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
      throw new NotFoundException('Veiculo nao encontrado.')
    }

    const historicalOdometerEvents = await this.vehiclesReadUseCaseService.getVehicleOdometerEvents(userId, vehicleId)
    const learning = this.vehiclesFuelMaintenanceService.calculateOdometerLearning(historicalOdometerEvents)
    const effectiveBeforeUpdate = this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(
      vehicle,
      learning.learnedAverageDailyKm,
    )

    if (updateVehicleDto.currentOdometer !== undefined) {
      this.vehiclesFuelMaintenanceService.assertOutlierIfNeeded({
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
        ? this.vehiclesFuelMaintenanceService.toUTCDate(updateVehicleDto.odometerBaseDate)
        : undefined,
    }

    if (updateVehicleDto.currentOdometer !== undefined) {
      nextData.odometerBaseValue = updateVehicleDto.currentOdometer
      nextData.odometerBaseDate = new Date()
    }

    if (updateVehicleDto.autoOdometerEnabled === true && !nextData.odometerBaseValue) {
      const baselineFromVehicle = vehicle.currentOdometer ?? this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(vehicle)

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
      throw new NotFoundException('Veiculo nao encontrado.')
    }

    const bankAccount = await this.bankAccountsRepo.findFirst({
      where: {
        id: createVehiclePartDto.bankAccountId,
        userId,
      },
      select: { id: true },
    })

    if (!bankAccount) {
      throw new NotFoundException('Conta bancaria nao encontrada.')
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
        throw new NotFoundException('Categoria de despesa nao encontrada.')
      }
    }

    if (createVehiclePartDto.totalCost <= 0) {
      throw new BadRequestException('Custo total invalido.')
    }

    const installedAt = this.vehiclesFuelMaintenanceService.toUTCDate(createVehiclePartDto.installedAt)
    const description = `Peca ${createVehiclePartDto.name} - ${vehicle.name}`
    const effectiveCurrentOdometer = this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(vehicle)

    if (createVehiclePartDto.installedOdometer !== undefined && createVehiclePartDto.installedOdometer !== null) {
      this.vehiclesFuelMaintenanceService.assertOutlierIfNeeded({
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
      throw new NotFoundException('Veiculo nao encontrado.')
    }

    const events = await this.vehiclesReadUseCaseService.getVehicleOdometerEvents(userId, vehicleId)
    const learning = this.vehiclesFuelMaintenanceService.calculateOdometerLearning(events)
    const effectiveCurrentOdometer = this.vehiclesFuelMaintenanceService.calculateEffectiveCurrentOdometer(
      vehicle,
      learning.learnedAverageDailyKm,
    )

    if (effectiveCurrentOdometer === null || effectiveCurrentOdometer === undefined) {
      throw new BadRequestException('Sem referencia de odometro para recalibrar.')
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
      throw new NotFoundException('Veiculo nao encontrado.')
    }
  }
}
