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
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import {
  RecurrenceAdjustmentScope,
} from '../dto/adjust-recurrence-future-values.dto'
import {
  TransactionCreationType,
  TransactionStatus,
  TransactionType,
} from '../entities/Transaction'
import { randomUUID } from 'crypto'
import {
  ImportBankStatementDto,
} from '../dto/import-bank-statement.dto'
import { StatementImportService } from './statement-import/statement-import.service'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { TransactionsGateway } from '../transactions.gateway'

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
    private readonly categoriesRepo: CategoriesRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly statementImportService: StatementImportService,
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
    } =
      createTransactionDto

    let enrichedName = name
    let enrichedCategoryId = categoryId

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

  async importBankStatement(userId: string, importDto: ImportBankStatementDto) {
    await this.validateBankAccountOwnershipService.validate(userId, importDto.bankAccountId)

    const [user, userBankAccounts] = await Promise.all([
      this.usersRepo.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      this.bankAccountsRepo.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
    ])

    const parsedEntries = this.statementImportService.parse(
      importDto.bank,
      importDto.csvContent,
    )
    const uniqueEntries = StatementImportService.dedupeEntries(parsedEntries)

    const fallbackCategories = await this.getOrCreateImportFallbackCategories(userId)
    const availableCategories = await this.categoriesRepo.findMany({
      where: {
        userId,
        type: {
          in: [TransactionType.INCOME, TransactionType.EXPENSE],
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    })

    const categoriesById = new Map(
      availableCategories.map((category) => [category.id, category]),
    )
    const bankAccountName = userBankAccounts.find((account) => account.id === importDto.bankAccountId)?.name

    const aiCategories = availableCategories.reduce<Array<{
      id: string;
      name: string;
      type: 'INCOME' | 'EXPENSE';
    }>>((result, category) => {
      if (category.type !== 'INCOME' && category.type !== 'EXPENSE') {
        return result
      }

      result.push({
        id: category.id,
        name: category.name,
        type: category.type,
      })

      return result
    }, [])

    const aiSuggestionsByIndex = await this.transactionImportAiEnrichmentService.enrichEntries({
      entries: uniqueEntries.map((entry, index) => ({
        index,
        description: entry.description,
        type:
          entry.value < 0
            ? TransactionType.EXPENSE
            : TransactionType.INCOME,
        amount: Math.abs(entry.value),
      })),
      categories: aiCategories,
      userName: user?.name,
      bankAccountName,
      userBankAccounts,
    })

    const cardBillCategoryId = this.findCardBillCategoryId(availableCategories)

    let importedCount = 0
    let skippedCount = 0
    let failedCount = 0
    let aiEnhancedCount = 0
    let transferDetectedCount = 0
    let cardBillPaymentDetectedCount = 0
    let processedRows = 0
    const totalRows = uniqueEntries.length
    const startedAt = Date.now()
    const requestId = importDto.requestId?.trim() || undefined

    const emitImportProgress = (
      stage: 'STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
      message?: string,
    ) => {
      const elapsedMs = Date.now() - startedAt
      const progress = totalRows === 0
        ? stage === 'COMPLETED'
          ? 100
          : 0
        : Math.min(100, Math.round((processedRows / totalRows) * 100))

      const etaMs = processedRows > 0 && processedRows < totalRows
        ? Math.max(0, Math.round((elapsedMs / processedRows) * (totalRows - processedRows)))
        : undefined

      this.transactionsGateway.emitFinancialImportProgress(userId, {
        source: 'BANK_STATEMENT',
        stage,
        requestId,
        bankAccountId: importDto.bankAccountId,
        progress,
        processedRows,
        totalRows,
        importedCount,
        skippedCount,
        failedCount,
        elapsedMs,
        etaMs,
        message,
      })
    }

    emitImportProgress('STARTED', 'Importação iniciada.')

    try {
      for (const [entryIndex, entry] of uniqueEntries.entries()) {
        try {
          const baseType = entry.value < 0 ? TransactionType.EXPENSE : TransactionType.INCOME
          const value = Math.abs(entry.value)
          const aiSuggestion = aiSuggestionsByIndex.get(entryIndex)
          const normalizedName = this.buildImportedTransactionName(
            aiSuggestion?.normalizedDescription
            || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(entry.description),
          )
          const resolvedKind = this.resolveImportedTransactionKind({
            description: entry.description,
            userName: user?.name,
            baseType,
            suggestedKind: aiSuggestion?.transactionKind,
          })

          if (aiSuggestion?.normalizedDescription || aiSuggestion?.categoryId || aiSuggestion?.transactionKind) {
            aiEnhancedCount += 1
          }

          if (resolvedKind === 'TRANSFER') {
            const alreadyImportedTransfer = await this.findPossibleDuplicateTransaction({
              userId,
              bankAccountId: importDto.bankAccountId,
              date: entry.date,
              value: entry.value,
              type: TransactionType.TRANSFER,
              name: normalizedName,
              matchByName: false,
            })

            if (alreadyImportedTransfer) {
              skippedCount += 1
              continue
            }

            const counterpartBankAccountId = this.resolveOwnTransferCounterpartBankAccountId({
              description: normalizedName,
              currentBankAccountId: importDto.bankAccountId,
              userBankAccounts,
            })

            await this.createImportedTransferTransaction({
              userId,
              bankAccountId: importDto.bankAccountId,
              date: entry.date,
              name: normalizedName,
              signedValue: entry.value,
              counterpartBankAccountId,
              userBankAccounts,
              suppressRealtime: true,
            })

            transferDetectedCount += 1
            importedCount += 1
            continue
          }

          if (resolvedKind === 'CARD_BILL_PAYMENT') {
            cardBillPaymentDetectedCount += 1
          }

          const type = resolvedKind === 'INCOME'
            ? TransactionType.INCOME
            : TransactionType.EXPENSE

          const resolvedCategoryId = this.resolveImportedCategoryId({
            type,
            transactionKind: resolvedKind,
            suggestedCategoryId: aiSuggestion?.categoryId,
            cardBillCategoryId,
            description: normalizedName,
            categoriesById,
            fallbackCategories,
          })

          const alreadyImported = await this.findPossibleDuplicateTransaction({
            userId,
            bankAccountId: importDto.bankAccountId,
            date: entry.date,
            value,
            type,
            name: normalizedName,
          })

          if (alreadyImported) {
            skippedCount += 1
            continue
          }

          await this.create(userId, {
            bankAccountId: importDto.bankAccountId,
            categoryId: resolvedCategoryId,
            name: normalizedName,
            value,
            type,
            date: entry.date.toISOString(),
            repeatType: TransactionCreationType.ONCE,
          }, { suppressRealtime: true })

          importedCount += 1
        } catch {
          failedCount += 1
        } finally {
          processedRows += 1
          emitImportProgress('PROCESSING', 'Processando lançamentos...')
        }
      }
    } catch (error) {
      emitImportProgress('FAILED', 'Falha no processamento da importação.')
      throw error
    }

    if (importedCount > 0) {
      this.transactionsGateway.emitTransactionsChanged(userId, {
        action: 'IMPORTED',
        source: 'BANK_IMPORT',
        count: importedCount,
      })
    }

    emitImportProgress('COMPLETED', 'Importação concluída.')

    return {
      bank: importDto.bank,
      totalRows: parsedEntries.length,
      uniqueRows: uniqueEntries.length,
      importedCount,
      skippedCount,
      failedCount,
      aiEnhancedCount,
      transferDetectedCount,
      cardBillPaymentDetectedCount,
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
      orderBy: {
        date: 'desc',
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

    const updatedTransaction = await this.transactionsRepo.update({
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

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'UPDATED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
    })

    return updatedTransaction
  }

  async updateStatus(
    userId: string,
    transactionId: string,
    status: TransactionStatus,
  ) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    const updatedTransaction = await this.transactionsRepo.update({
      where: { id: transactionId },
      data: { status },
    })

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'UPDATED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
    })

    return updatedTransaction
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

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'DELETED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
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

  private async getOrCreateImportFallbackCategories(userId: string) {
    const expenseCategory = await this.findOrCreateImportCategory(
      userId,
      'Importado do banco (despesas)',
      TransactionType.EXPENSE,
    )

    const incomeCategory = await this.findOrCreateImportCategory(
      userId,
      'Importado do banco (receitas)',
      TransactionType.INCOME,
    )

    return {
      expenseCategoryId: expenseCategory.id,
      incomeCategoryId: incomeCategory.id,
    }
  }

  private async findOrCreateImportCategory(
    userId: string,
    name: string,
    type: TransactionType,
  ) {
    const existingCategory = await this.categoriesRepo.findFirst({
      where: {
        userId,
        name,
        type,
      },
      select: {
        id: true,
      },
    })

    if (existingCategory) {
      return existingCategory
    }

    return this.categoriesRepo.create({
      data: {
        userId,
        name,
        type,
        icon: 'default',
      },
      select: {
        id: true,
      },
    })
  }

  private async findPossibleDuplicateTransaction({
    userId,
    bankAccountId,
    date,
    value,
    type,
    name,
    matchByName = true,
  }: {
    userId: string;
    bankAccountId: string;
    date: Date;
    value: number;
    type: TransactionType;
    name: string;
    matchByName?: boolean;
  }) {
    const dayStart = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ))

    const dayEnd = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ))

    return this.transactionsRepo.findFirst({
      where: {
        userId,
        bankAccountId,
        ...(matchByName ? { name } : {}),
        value,
        type,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        id: true,
      },
    })
  }

  private buildImportedTransactionName(description: string) {
    return description.trim().slice(0, 120)
  }

  private resolveImportedCategoryId({
    type,
    transactionKind,
    suggestedCategoryId,
    cardBillCategoryId,
    description,
    categoriesById,
    fallbackCategories,
  }: {
    type: TransactionType.INCOME | TransactionType.EXPENSE;
    transactionKind: 'INCOME' | 'EXPENSE' | 'CARD_BILL_PAYMENT';
    suggestedCategoryId?: string;
    cardBillCategoryId?: string;
    description: string;
    categoriesById: Map<string, { id: string; name: string; type: string }>;
    fallbackCategories: { expenseCategoryId: string; incomeCategoryId: string };
  }) {
    if (suggestedCategoryId) {
      const suggestedCategory = categoriesById.get(suggestedCategoryId)

      if (suggestedCategory && suggestedCategory.type === type) {
        return suggestedCategory.id
      }
    }

    if (transactionKind === 'CARD_BILL_PAYMENT' && cardBillCategoryId) {
      return cardBillCategoryId
    }

    const categoryByDescription = this.findCategoryByDescription(
      type,
      description,
      categoriesById,
    )

    if (categoryByDescription) {
      return categoryByDescription
    }

    return type === TransactionType.EXPENSE
      ? fallbackCategories.expenseCategoryId
      : fallbackCategories.incomeCategoryId
  }

  private findCategoryByDescription(
    type: TransactionType.INCOME | TransactionType.EXPENSE,
    description: string,
    categoriesById: Map<string, { id: string; name: string; type: string }>,
  ) {
    const normalizedDescription = this.normalizeText(description)
    const expandedDescription = this.expandMerchantAliases(normalizedDescription)

    const compatibleCategories = Array.from(categoriesById.values())
      .filter((category) => category.type === type)

    let bestCategoryId: string | null = null
    let bestScore = 0

    for (const category of compatibleCategories) {
      const normalizedCategoryName = this.normalizeText(category.name)

      if (!normalizedCategoryName) {
        continue
      }

      const categoryTokens = normalizedCategoryName
        .split(' ')
        .filter((token) => token.length >= 3)

      let score = 0

      if (expandedDescription.includes(normalizedCategoryName)) {
        score += 10
      }

      categoryTokens.forEach((token) => {
        if (expandedDescription.includes(token)) {
          score += 3
        }
      })

      if (score > bestScore) {
        bestScore = score
        bestCategoryId = category.id
      }
    }

    return bestScore >= 6 ? bestCategoryId : null
  }

  private resolveImportedTransactionKind({
    description,
    userName,
    baseType,
    suggestedKind,
  }: {
    description: string;
    userName?: string;
    baseType: TransactionType.INCOME | TransactionType.EXPENSE;
    suggestedKind?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CARD_BILL_PAYMENT';
  }) {
    if (this.isCardBillPaymentDescription(description)) {
      return 'CARD_BILL_PAYMENT' as const
    }

    if (this.isInternalBalanceMovementDescription(description)) {
      return 'TRANSFER' as const
    }

    if (this.isLikelyOwnTransfer(description, userName)) {
      return 'TRANSFER' as const
    }

    if (
      suggestedKind === 'TRANSFER'
      || suggestedKind === 'CARD_BILL_PAYMENT'
      || suggestedKind === 'INCOME'
      || suggestedKind === 'EXPENSE'
    ) {
      return suggestedKind
    }

    return baseType === TransactionType.INCOME ? 'INCOME' : 'EXPENSE'
  }

  private isCardBillPaymentDescription(description: string) {
    const normalized = this.normalizeText(description)

    return normalized.includes('pagamento de fatura')
      || normalized.includes('fatura do cartao')
      || normalized.includes('pix para cartao de credito')
      || normalized.includes('pagamento cartao de credito')
      || normalized.includes('pagto cartao credito')
      || normalized.includes('pagto cartao de credito')
      || normalized.includes('pagamento cartao credito')
  }

  private isLikelyOwnTransfer(description: string, userName?: string) {
    const normalizedDescription = this.normalizeText(description)

    const isOwnAccountPhrase = normalizedDescription.includes('conta propria')
      || normalizedDescription.includes('mesma titularidade')

    if (isOwnAccountPhrase && normalizedDescription.includes('pix')) {
      return true
    }

    if (!normalizedDescription.includes('transferencia') || !normalizedDescription.includes('pix')) {
      return false
    }

    if (!userName) {
      return false
    }

    const normalizedUserName = this.normalizeText(userName)

    if (!normalizedUserName) {
      return false
    }

    if (normalizedDescription.includes(normalizedUserName)) {
      return true
    }

    const userTokens = normalizedUserName
      .split(' ')
      .filter((token) => token.length >= 3)

    const matchedTokens = userTokens.filter((token) => normalizedDescription.includes(token))

    return matchedTokens.length >= 2
  }

  private isInternalBalanceMovementDescription(description: string) {
    const normalized = this.normalizeText(description)

    return normalized.includes('resgate bb rende facil')
      || normalized.includes('aplicacao bb rende facil')
      || normalized.includes('bb rende facil')
      || normalized.includes('resgate rdb')
      || normalized.includes('aplicacao rdb')
      || normalized.includes('debito em conta')
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  private expandMerchantAliases(normalizedDescription: string) {
    const aliases = [
      { pattern: /shpp brasil/g, canonical: 'shopee' },
      { pattern: /fisia comercio de produtos esportivos/g, canonical: 'nike' },
      { pattern: /\bfisia\b/g, canonical: 'nike' },
    ]

    let expanded = normalizedDescription

    aliases.forEach((alias) => {
      if (alias.pattern.test(expanded)) {
        expanded = `${expanded} ${alias.canonical}`
      }

      alias.pattern.lastIndex = 0
    })

    return expanded
  }

  private async createImportedTransferTransaction({
    userId,
    bankAccountId,
    date,
    name,
    signedValue,
    counterpartBankAccountId,
    userBankAccounts,
    suppressRealtime,
  }: {
    userId: string;
    bankAccountId: string;
    date: Date;
    name: string;
    signedValue: number;
    counterpartBankAccountId?: string;
    userBankAccounts: Array<{ id: string; name: string }>;
    suppressRealtime?: boolean;
  }) {
    const createdTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId,
        categoryId: null,
        name,
        value: signedValue,
        date,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        entryType: 'SINGLE',
      },
    })

    if (!counterpartBankAccountId || counterpartBankAccountId === bankAccountId) {
      if (!suppressRealtime) {
        this.transactionsGateway.emitTransactionsChanged(userId, {
          action: 'CREATED',
          source: 'MANUAL',
          count: 1,
          transactionIds: [createdTransaction.id],
        })
      }

      return createdTransaction
    }

    const mirroredValue = -signedValue
    const currentAccountName = userBankAccounts.find((account) => account.id === bankAccountId)?.name

    const counterpartDescription = mirroredValue >= 0
      ? `Transferência recebida de conta própria${currentAccountName ? ` (${currentAccountName})` : ''}`
      : `Transferência enviada para conta própria${currentAccountName ? ` (${currentAccountName})` : ''}`

    const duplicateCounterpart = await this.findPossibleDuplicateTransaction({
      userId,
      bankAccountId: counterpartBankAccountId,
      date,
      value: mirroredValue,
      type: TransactionType.TRANSFER,
      name: counterpartDescription,
      matchByName: false,
    })

    let mirroredTransactionId: string | undefined

    if (!duplicateCounterpart) {
      const mirroredTransaction = await this.transactionsRepo.create({
        data: {
          userId,
          bankAccountId: counterpartBankAccountId,
          categoryId: null,
          name: counterpartDescription,
          value: mirroredValue,
          date,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.POSTED,
          entryType: 'SINGLE',
        },
      })

      mirroredTransactionId = mirroredTransaction.id
    }

    if (!suppressRealtime) {
      this.transactionsGateway.emitTransactionsChanged(userId, {
        action: 'CREATED',
        source: 'MANUAL',
        count: mirroredTransactionId ? 2 : 1,
        transactionIds: mirroredTransactionId
          ? [createdTransaction.id, mirroredTransactionId]
          : [createdTransaction.id],
      })
    }

    return createdTransaction
  }

  private resolveOwnTransferCounterpartBankAccountId({
    description,
    currentBankAccountId,
    userBankAccounts,
  }: {
    description: string;
    currentBankAccountId: string;
    userBankAccounts: Array<{ id: string; name: string }>;
  }) {
    const normalizedDescription = this.normalizeText(description)

    if (!normalizedDescription.includes('conta propria')) {
      return undefined
    }

    const otherAccounts = userBankAccounts.filter((account) => account.id !== currentBankAccountId)

    if (!otherAccounts.length) {
      return undefined
    }

    const hintedText = this.extractParenthesesContent(description)
    const normalizedHint = hintedText ? this.normalizeText(hintedText) : ''

    if (normalizedHint) {
      const hintedAccount = otherAccounts.find((account) => {
        const normalizedAccountName = this.normalizeText(account.name)

        return normalizedHint.includes(normalizedAccountName)
          || normalizedAccountName.includes(normalizedHint)
      })

      if (hintedAccount) {
        return hintedAccount.id
      }
    }

    const keywordAliases: Array<{ keyword: string; aliases: string[] }> = [
      { keyword: 'nubank', aliases: ['nubank', 'nu bank', 'nu'] },
      { keyword: 'banco do brasil', aliases: ['banco do brasil', 'bb'] },
      { keyword: 'sicoob', aliases: ['sicoob', 'ccla canoinhas', 'cooperativa'] },
      { keyword: 'caixa', aliases: ['caixa', 'cef'] },
      { keyword: 'itau', aliases: ['itau', 'itaú'] },
      { keyword: 'bradesco', aliases: ['bradesco'] },
      { keyword: 'santander', aliases: ['santander'] },
      { keyword: 'inter', aliases: ['inter', 'banco inter'] },
    ]

    for (const account of otherAccounts) {
      const normalizedAccountName = this.normalizeText(account.name)

      if (normalizedDescription.includes(normalizedAccountName)) {
        return account.id
      }

      const aliasGroup = keywordAliases.find((group) =>
        group.aliases.some((alias) => normalizedAccountName.includes(this.normalizeText(alias))),
      )

      if (
        aliasGroup &&
        aliasGroup.aliases.some((alias) => normalizedDescription.includes(this.normalizeText(alias)))
      ) {
        return account.id
      }
    }

    if (otherAccounts.length === 1) {
      return otherAccounts[0].id
    }

    return undefined
  }

  private extractParenthesesContent(text: string) {
    const match = text.match(/\(([^)]+)\)/)

    return match?.[1]?.trim()
  }

  private findCardBillCategoryId(
    categories: Array<{ id: string; name: string; type: string }>,
  ) {
    const normalizedCandidates = categories
      .filter((category) => category.type === TransactionType.EXPENSE)
      .map((category) => ({
        id: category.id,
        normalizedName: this.normalizeText(category.name),
      }))

    const directMatch = normalizedCandidates.find((candidate) => (
      candidate.normalizedName.includes('fatura')
      || candidate.normalizedName.includes('cartao')
      || candidate.normalizedName.includes('credito')
    ))

    return directMatch?.id
  }
}
