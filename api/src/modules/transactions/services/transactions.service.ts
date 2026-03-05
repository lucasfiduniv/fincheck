import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateTransactionDto } from '../dto/create-transaction.dto'
import { CreateTransferDto } from '../dto/create-transfer.dto'
import { UpdateTransactionDto } from '../dto/update-transaction.dto'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { ValidateTransactionOwnershipService } from './validate-transaction-ownership.service'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { FuelRecordsRepository } from 'src/shared/database/repositories/fuel-records.repository'
import { PrismaService } from 'src/shared/database/prisma.service'
import {
  RecurrenceAdjustmentScope,
} from '../dto/adjust-recurrence-future-values.dto'
import {
  TransactionCreationType,
  TransactionStatus,
  TransactionType,
} from '../entities/Transaction'
import { randomUUID } from 'crypto'

@Injectable()
export class TransactionsService {
  private readonly defaultRecurringMonths = 24

  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly fuelRecordsRepo: FuelRecordsRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const {
      bankAccountId,
      categoryId,
      date,
      name,
      type,
      value,
      repeatCount,
      repeatType,
      dueDay,
      alertDaysBefore,
      fuelVehicleId,
      fuelOdometer,
      fuelLiters,
      fuelPricePerLiter,
      maintenanceVehicleId,
      maintenanceOdometer,
    } =
      createTransactionDto

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
    })

    if (type === TransactionType.TRANSFER) {
      throw new BadRequestException('Use o endpoint de transferências para criar transferências entre contas.')
    }

    const creationType = repeatType ?? TransactionCreationType.ONCE

    const hasFuelMetadata =
      !!fuelVehicleId ||
      fuelOdometer !== undefined ||
      fuelLiters !== undefined ||
      fuelPricePerLiter !== undefined

    const hasMaintenanceMetadata =
      !!maintenanceVehicleId ||
      maintenanceOdometer !== undefined

    if (hasFuelMetadata) {
      if (type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Abastecimento só pode ser registrado em despesas.')
      }

      if (creationType !== TransactionCreationType.ONCE) {
        throw new BadRequestException('Abastecimento deve ser um lançamento único.')
      }

      if (!fuelVehicleId || fuelOdometer === undefined || fuelLiters === undefined || fuelPricePerLiter === undefined) {
        throw new BadRequestException('Para abastecimento informe veículo, odômetro, litros e preço por litro.')
      }

      const vehicle = await this.vehiclesRepo.findFirst({
        where: {
          id: fuelVehicleId,
          userId,
        },
        select: {
          id: true,
        },
      })

      if (!vehicle) {
        throw new BadRequestException('Veículo informado não encontrado para este usuário.')
      }
    }

    if (hasMaintenanceMetadata) {
      if (type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Manutenção só pode ser registrada em despesas.')
      }

      if (!maintenanceVehicleId) {
        throw new BadRequestException('Para manutenção informe o veículo.')
      }

      const vehicle = await this.vehiclesRepo.findFirst({
        where: {
          id: maintenanceVehicleId,
          userId,
        },
        select: {
          id: true,
        },
      })

      if (!vehicle) {
        throw new BadRequestException('Veículo informado não encontrado para este usuário.')
      }
    }

    if (
      creationType === TransactionCreationType.INSTALLMENT &&
      !repeatCount
    ) {
      throw new BadRequestException('repeatCount is required for installments.')
    }

    const transactionsCount =
      creationType === TransactionCreationType.ONCE
        ? 1
        : creationType === TransactionCreationType.INSTALLMENT
          ? repeatCount!
          : repeatCount ?? this.defaultRecurringMonths
    const recurrenceGroupId =
      creationType === TransactionCreationType.ONCE ? null : randomUUID()
    const baseDate = this.toUTCDate(date)

    const createdTransactions = await Promise.all(
      Array.from({ length: transactionsCount }).map((_, index) => {
        const occurrenceDate =
          creationType === TransactionCreationType.ONCE
            ? baseDate
            : this.buildMonthlyOccurrenceDate(baseDate, index, dueDay)
        const installmentLabel = `${name} (${index + 1}/${transactionsCount})`

        return this.transactionsRepo.create({
          data: {
            userId,
            bankAccountId,
            categoryId,
            date: occurrenceDate,
            name:
              creationType === TransactionCreationType.INSTALLMENT
                ? installmentLabel
                : name,
            type,
            value,
            status: this.getStatusForCreationType(creationType),
            entryType: this.getEntryType(creationType),
            recurrenceGroupId,
            installmentNumber:
              creationType === TransactionCreationType.INSTALLMENT
                ? index + 1
                : null,
            installmentCount:
              creationType === TransactionCreationType.INSTALLMENT
                ? transactionsCount
                : null,
            dueDay:
              creationType === TransactionCreationType.ONCE
                ? null
                : dueDay ?? occurrenceDate.getUTCDate(),
            alertDaysBefore:
              creationType === TransactionCreationType.ONCE
                ? null
                : alertDaysBefore ?? 3,
            maintenanceVehicleId,
            maintenanceOdometer,
          },
        })
      }),
    )

    if (hasFuelMetadata && fuelVehicleId && fuelOdometer !== undefined && fuelLiters !== undefined && fuelPricePerLiter !== undefined) {
      const createdTransaction = createdTransactions[0]

      await this.fuelRecordsRepo.create({
        data: {
          userId,
          vehicleId: fuelVehicleId,
          transactionId: createdTransaction.id,
          odometer: fuelOdometer,
          liters: fuelLiters,
          pricePerLiter: fuelPricePerLiter,
          totalCost: Number((fuelLiters * fuelPricePerLiter).toFixed(2)),
        },
      })

      if (value >= 1000) {
        await this.prismaService.vehicleAuditLog.create({
          data: {
            userId,
            vehicleId: fuelVehicleId,
            eventType: 'HIGH_COST_RECORDED',
            previousValue: null,
            newValue: String(value),
            metadata: JSON.stringify({
              source: 'FUEL',
              transactionId: createdTransaction.id,
            }),
          },
        })
      }
    }

    if (hasMaintenanceMetadata && maintenanceVehicleId && value >= 1000) {
      await this.prismaService.vehicleAuditLog.create({
        data: {
          userId,
          vehicleId: maintenanceVehicleId,
          eventType: 'HIGH_COST_RECORDED',
          previousValue: null,
          newValue: String(value),
          metadata: JSON.stringify({
            source: 'MAINTENANCE',
            transactionId: createdTransactions[0].id,
          }),
        },
      })
    }

    return createdTransactions[0]
  }

  async createTransfer(userId: string, createTransferDto: CreateTransferDto) {
    const {
      fromBankAccountId,
      toBankAccountId,
      value,
      date,
      description,
    } = createTransferDto

    if (fromBankAccountId === toBankAccountId) {
      throw new BadRequestException('Transfer accounts must be different.')
    }

    await Promise.all([
      this.validateBankAccountOwnershipService.validate(userId, fromBankAccountId),
      this.validateBankAccountOwnershipService.validate(userId, toBankAccountId),
    ])

    const normalizedDate = this.toUTCDate(date)
    const transferLabel = description?.trim() || 'Transferência entre contas'

    const outgoingTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: fromBankAccountId,
        categoryId: null,
        name: `${transferLabel} (saída)`,
        value: -value,
        date: normalizedDate,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        entryType: 'SINGLE',
      },
    })

    const incomingTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: toBankAccountId,
        categoryId: null,
        name: `${transferLabel} (entrada)`,
        value,
        date: normalizedDate,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        entryType: 'SINGLE',
      },
    })

    return {
      fromTransactionId: outgoingTransaction.id,
      toTransactionId: incomingTransaction.id,
    }
  }

  findAllByUserId(
    userId: string,
    filters: {
      month: number;
      year: number;
      bankAccountId?: string;
      type?: TransactionType;
    },
  ) {
    return this.transactionsRepo.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.UTC(filters.year, filters.month)),
          lt: new Date(Date.UTC(filters.year, filters.month + 1)),
        },
        bankAccountId: filters.bankAccountId,
        type: filters.type,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    })
  }

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { bankAccountId, categoryId, date, name, type, value } =
      updateTransactionDto

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
      transactionId,
    })

    const currentTransaction = await this.transactionsRepo.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: {
        type: true,
      },
    })

    if (currentTransaction?.type === TransactionType.TRANSFER || type === TransactionType.TRANSFER) {
      throw new BadRequestException('Transferências entre contas não podem ser editadas por esta rota.')
    }

    return this.transactionsRepo.update({
      where: { id: transactionId },
      data: {
        bankAccountId,
        categoryId,
        date,
        name,
        type,
        value,
      },
    })
  }

  async updateStatus(
    userId: string,
    transactionId: string,
    status: TransactionStatus,
  ) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    return this.transactionsRepo.update({
      where: { id: transactionId },
      data: { status },
    })
  }

  async adjustFutureValuesByRecurrenceGroup(
    userId: string,
    recurrenceGroupId: string,
    data: {
      value: number;
      fromDate?: string;
      scope?: RecurrenceAdjustmentScope;
      transactionId?: string;
    },
  ) {
    const recurrenceGroup = await this.transactionsRepo.findFirst({
      where: {
        userId,
        recurrenceGroupId,
      },
      select: { id: true },
    })

    if (!recurrenceGroup) {
      throw new BadRequestException('Recurrence group not found.')
    }

    const scope = data.scope ?? RecurrenceAdjustmentScope.THIS_AND_NEXT

    const anchorTransaction = data.transactionId
      ? await this.transactionsRepo.findFirst({
          where: {
            id: data.transactionId,
            userId,
            recurrenceGroupId,
          },
          select: {
            id: true,
            date: true,
          },
        })
      : null

    if (data.transactionId && !anchorTransaction) {
      throw new BadRequestException('Transaction does not belong to this recurrence group.')
    }

    if (scope === RecurrenceAdjustmentScope.THIS) {
      if (!anchorTransaction) {
        throw new BadRequestException('transactionId is required when scope is THIS.')
      }

      return this.transactionsRepo.updateMany({
        where: {
          userId,
          recurrenceGroupId,
          id: anchorTransaction.id,
        },
        data: {
          value: data.value,
        },
      })
    }

    if (scope === RecurrenceAdjustmentScope.ALL) {
      return this.transactionsRepo.updateMany({
        where: {
          userId,
          recurrenceGroupId,
          status: TransactionStatus.PLANNED,
        },
        data: {
          value: data.value,
        },
      })
    }

    const fromDate = anchorTransaction?.date
      ?? (data.fromDate ? new Date(data.fromDate) : new Date())

    return this.transactionsRepo.updateMany({
      where: {
        userId,
        recurrenceGroupId,
        status: TransactionStatus.PLANNED,
        date: {
          gte: fromDate,
        },
      },
      data: {
        value: data.value,
      },
    })
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    await this.transactionsRepo.delete({
      where: { id: transactionId },
    })
  }

  async findDueAlertsSummaryByMonth(
    userId: string,
    { month, year }: { month: number; year: number },
  ) {
    const reminders = await this.transactionsRepo.findMany({
      where: {
        userId,
        status: TransactionStatus.PLANNED,
        entryType: {
          in: ['RECURRING', 'INSTALLMENT'],
        },
        dueDay: {
          not: null,
        },
        date: {
          gte: new Date(Date.UTC(year, month)),
          lt: new Date(Date.UTC(year, month + 1)),
        },
      },
      orderBy: [{ dueDay: 'asc' }, { name: 'asc' }],
    })

    const uniqueByGroup = new Map<string, (typeof reminders)[number]>()

    for (const reminder of reminders) {
      const groupKey =
        reminder.recurrenceGroupId ?? `${reminder.id}-${reminder.name}`

      if (!uniqueByGroup.has(groupKey)) {
        uniqueByGroup.set(groupKey, reminder)
      }
    }

    const now = new Date()
    const nowAtMidnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )

    return Array.from(uniqueByGroup.values()).map((reminder) => {
      const reminderDueDay = reminder.dueDay ?? reminder.date.getUTCDate()
      const dueDateAtMidnight = new Date(Date.UTC(year, month, reminderDueDay))
      const dayDiff = Math.floor(
        (dueDateAtMidnight.getTime() - nowAtMidnight.getTime()) /
          (1000 * 60 * 60 * 24),
      )

      const alertBefore = reminder.alertDaysBefore ?? 3

      const status =
        dayDiff < 0
          ? 'OVERDUE'
          : dayDiff === 0
            ? 'DUE_TODAY'
            : dayDiff <= alertBefore
              ? 'UPCOMING'
              : 'FUTURE'

      return {
        id: reminder.id,
        recurrenceGroupId: reminder.recurrenceGroupId,
        name: reminder.name,
        entryType: reminder.entryType,
        dueDay: reminderDueDay,
        alertDaysBefore: alertBefore,
        amount: reminder.value,
        daysUntilDue: dayDiff,
        status,
        hasAlert: status !== 'FUTURE',
      }
    })
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
  }) {
    await Promise.all([
      transactionId &&
        this.validateTransactionOwnershipService.validate(
          userId,
          transactionId,
        ),
      bankAccountId &&
        this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId &&
        this.validateCategoryOwnershipService.validate(userId, categoryId),
    ])
  }

  private addMonthsUTC(date: Date, monthsToAdd: number) {
    const utcDate = new Date(date)

    utcDate.setUTCMonth(utcDate.getUTCMonth() + monthsToAdd)

    return utcDate
  }

  private toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  private buildMonthlyOccurrenceDate(
    baseDate: Date,
    monthsToAdd: number,
    dueDay?: number,
  ) {
    const targetYear = baseDate.getUTCFullYear()
    const targetMonth = baseDate.getUTCMonth() + monthsToAdd
    const dueDayToUse = dueDay ?? baseDate.getUTCDate()
    const maxDayInMonth = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0),
    ).getUTCDate()
    const normalizedDay = Math.min(dueDayToUse, maxDayInMonth)

    return new Date(Date.UTC(targetYear, targetMonth, normalizedDay))
  }

  private getEntryType(type: TransactionCreationType) {
    if (type === TransactionCreationType.RECURRING) {
      return 'RECURRING'
    }

    if (type === TransactionCreationType.INSTALLMENT) {
      return 'INSTALLMENT'
    }

    return 'SINGLE'
  }

  private getStatusForCreationType(type: TransactionCreationType) {
    if (type === TransactionCreationType.ONCE) {
      return TransactionStatus.POSTED
    }

    return TransactionStatus.PLANNED
  }
}
