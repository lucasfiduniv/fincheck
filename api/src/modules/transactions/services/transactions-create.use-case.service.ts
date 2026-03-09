import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { FuelRecordsRepository } from 'src/shared/database/repositories/fuel-records.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { PrismaService } from 'src/shared/database/prisma.service'
import { CreateTransactionDto } from '../dto/create-transaction.dto'
import { CreateTransferDto } from '../dto/create-transfer.dto'
import {
  TransactionCreationType,
  TransactionStatus,
  TransactionType,
} from '../entities/Transaction'
import { TransactionsGateway } from '../transactions.gateway'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'

@Injectable()
export class TransactionsCreateUseCaseService {
  private readonly defaultRecurringMonths = 24

  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly fuelRecordsRepo: FuelRecordsRepository,
    private readonly prismaService: PrismaService,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
    private readonly transactionsGateway: TransactionsGateway,
  ) {}

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto,
    options?: { suppressRealtime?: boolean },
  ) {
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
      fuelFillType,
      fuelFirstPumpClick,
      maintenanceVehicleId,
      maintenanceOdometer,
    } = createTransactionDto

    let enrichedName = name
    let enrichedCategoryId = categoryId

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId,
    })

    if (type === TransactionType.TRANSFER) {
      throw new BadRequestException('Use o endpoint de transferencias para criar transferencias entre contas.')
    }

    const creationType = repeatType ?? TransactionCreationType.ONCE

    const hasFuelMetadata =
      !!fuelVehicleId
      || fuelOdometer !== undefined
      || fuelLiters !== undefined
      || fuelPricePerLiter !== undefined

    const hasMaintenanceMetadata =
      !!maintenanceVehicleId
      || maintenanceOdometer !== undefined

    if (hasFuelMetadata) {
      if (type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Abastecimento so pode ser registrado em despesas.')
      }

      if (creationType !== TransactionCreationType.ONCE) {
        throw new BadRequestException('Abastecimento deve ser um lancamento unico.')
      }

      if (!fuelVehicleId || fuelOdometer === undefined || fuelLiters === undefined || fuelPricePerLiter === undefined) {
        throw new BadRequestException('Para abastecimento informe veiculo, odometro, litros e preco por litro.')
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
        throw new BadRequestException('Veiculo informado nao encontrado para este usuario.')
      }
    }

    if (hasMaintenanceMetadata) {
      if (type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Manutencao so pode ser registrada em despesas.')
      }

      if (!maintenanceVehicleId) {
        throw new BadRequestException('Para manutencao informe o veiculo.')
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
        throw new BadRequestException('Veiculo informado nao encontrado para este usuario.')
      }
    }

    if (
      creationType === TransactionCreationType.INSTALLMENT
      && !repeatCount
    ) {
      throw new BadRequestException('repeatCount is required for installments.')
    }

    if (type === TransactionType.EXPENSE) {
      const enrichment = await this.enrichManualExpenseInput({
        userId,
        bankAccountId,
        name,
        value,
        currentCategoryId: categoryId,
      })

      enrichedName = enrichment.name
      enrichedCategoryId = enrichment.categoryId

      if (enrichedCategoryId && enrichedCategoryId !== categoryId) {
        await this.validateCategoryOwnershipService.validate(userId, enrichedCategoryId)
      }
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

        return this.transactionsRepo.create({
          data: {
            userId,
            bankAccountId,
            categoryId: enrichedCategoryId,
            date: occurrenceDate,
            name:
              creationType === TransactionCreationType.INSTALLMENT
                ? `${enrichedName} (${index + 1}/${transactionsCount})`
                : enrichedName,
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
          fillType: fuelFillType ?? 'PARTIAL',
          firstPumpClick: !!fuelFirstPumpClick,
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

    if (!options?.suppressRealtime) {
      this.transactionsGateway.emitTransactionsChanged(userId, {
        action: 'CREATED',
        source: 'MANUAL',
        count: createdTransactions.length,
        transactionIds: createdTransactions.map((transaction) => transaction.id),
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
    const transferLabel = description?.trim() || 'Transferencia entre contas'

    const outgoingTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: fromBankAccountId,
        categoryId: null,
        name: `${transferLabel} (saida)`,
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

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'CREATED',
      source: 'MANUAL',
      count: 2,
      transactionIds: [outgoingTransaction.id, incomingTransaction.id],
    })

    return {
      fromTransactionId: outgoingTransaction.id,
      toTransactionId: incomingTransaction.id,
    }
  }

  private async enrichManualExpenseInput({
    userId,
    bankAccountId,
    name,
    value,
    currentCategoryId,
  }: {
    userId: string
    bankAccountId: string
    name: string
    value: number
    currentCategoryId: string
  }) {
    try {
      const [user, userBankAccounts, availableCategories] = await Promise.all([
        this.usersRepo.findUnique({
          where: { id: userId },
          select: { name: true },
        }),
        this.bankAccountsRepo.findMany({
          where: { userId },
          select: { id: true, name: true },
        }),
        this.categoriesRepo.findMany({
          where: {
            userId,
            type: TransactionType.EXPENSE,
          },
          select: {
            id: true,
            name: true,
            type: true,
          },
        }),
      ])

      const bankAccountName = userBankAccounts.find((account) => account.id === bankAccountId)?.name

      const aiSuggestions = await this.transactionImportAiEnrichmentService.enrichEntries({
        entries: [
          {
            index: 0,
            description: name,
            type: TransactionType.EXPENSE,
            amount: Math.abs(value),
          },
        ],
        categories: availableCategories.map((category) => ({
          id: category.id,
          name: category.name,
          type: 'EXPENSE' as const,
        })),
        userName: user?.name,
        bankAccountName,
        userBankAccounts,
      })

      const suggestion = aiSuggestions.get(0)
      const normalizedName = suggestion?.normalizedDescription?.trim()
        || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(name)

      if (!suggestion?.categoryId || suggestion.categoryId === currentCategoryId) {
        return {
          name: normalizedName,
          categoryId: currentCategoryId,
        }
      }

      const categoriesById = new Map(availableCategories.map((category) => [category.id, category]))
      const currentCategoryName = categoriesById.get(currentCategoryId)?.name

      const shouldReplaceCategory = !currentCategoryName || this.isGenericHomeCategory(currentCategoryName)

      return {
        name: normalizedName,
        categoryId: shouldReplaceCategory ? suggestion.categoryId : currentCategoryId,
      }
    } catch {
      return {
        name,
        categoryId: currentCategoryId,
      }
    }
  }

  private isGenericHomeCategory(categoryName?: string) {
    if (!categoryName) {
      return false
    }

    const normalized = this.normalizeText(categoryName)

    return normalized.includes('casa')
      || normalized.includes('lar')
      || normalized.includes('moradia')
      || normalized.includes('residenc')
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
  }) {
    await Promise.all([
      bankAccountId
        && this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId
        && this.validateCategoryOwnershipService.validate(userId, categoryId),
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
    const targetDate = this.addMonthsUTC(baseDate, monthsToAdd)
    const dueDayToUse = dueDay ?? baseDate.getUTCDate()
    const maxDayInMonth = new Date(
      Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0),
    ).getUTCDate()
    const normalizedDay = Math.min(dueDayToUse, maxDayInMonth)

    return new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), normalizedDay))
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

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }
}
