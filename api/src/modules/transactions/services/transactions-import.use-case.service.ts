import { Injectable } from '@nestjs/common'
import { BankAccountsRepository } from 'src/shared/database/repositories/bank-accounts.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { ImportBankStatementDto } from '../dto/import-bank-statement.dto'
import { TransactionCreationType, TransactionStatus, TransactionType } from '../entities/Transaction'
import { StatementImportService } from './statement-import/statement-import.service'
import { TransactionsGateway } from '../transactions.gateway'
import { TransactionsCreateUseCaseService } from './transactions-create.use-case.service'
import {
  buildImportedTransactionName,
  findCardBillCategoryId,
  isDuplicateNameEquivalent,
  isInternalBalanceMovementDescription,
  resolveImportedCategoryId,
  resolveImportedTransactionKind,
  resolveOwnTransferCounterpartBankAccountId,
  roundMoney,
  toMoneyCents,
} from './transactions-import.utils'

@Injectable()
export class TransactionsImportUseCaseService {
  constructor(
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly usersRepo: UsersRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly statementImportService: StatementImportService,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly transactionsGateway: TransactionsGateway,
    private readonly transactionsCreateUseCaseService: TransactionsCreateUseCaseService,
  ) {}

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

    const parsedEntries = await this.statementImportService.parse(
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

    const cardBillCategoryId = findCardBillCategoryId(availableCategories)

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

    emitImportProgress('STARTED', 'Importacao iniciada.')

    try {
      for (const [entryIndex, entry] of uniqueEntries.entries()) {
        try {
          const baseType = entry.value < 0 ? TransactionType.EXPENSE : TransactionType.INCOME
          const signedValue = roundMoney(entry.value)
          const value = Math.abs(signedValue)
          const aiSuggestion = aiSuggestionsByIndex.get(entryIndex)
          const normalizedName = buildImportedTransactionName(
            aiSuggestion?.normalizedDescription
            || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(entry.description),
          )

          if (
            isInternalBalanceMovementDescription(entry.description)
            || isInternalBalanceMovementDescription(normalizedName)
          ) {
            skippedCount += 1
            continue
          }

          const resolvedKind = resolveImportedTransactionKind({
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
              value: signedValue,
              type: TransactionType.TRANSFER,
              name: normalizedName,
              matchByName: false,
            })

            if (alreadyImportedTransfer) {
              skippedCount += 1
              continue
            }

            const counterpartBankAccountId = resolveOwnTransferCounterpartBankAccountId({
              description: normalizedName,
              currentBankAccountId: importDto.bankAccountId,
              userBankAccounts,
            })

            await this.createImportedTransferTransaction({
              userId,
              bankAccountId: importDto.bankAccountId,
              date: entry.date,
              name: normalizedName,
              signedValue,
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

          const resolvedCategoryId = resolveImportedCategoryId({
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

          await this.transactionsCreateUseCaseService.create(userId, {
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
          emitImportProgress('PROCESSING', 'Processando lancamentos...')
        }
      }
    } catch (error) {
      emitImportProgress('FAILED', 'Falha no processamento da importacao.')
      throw error
    }

    if (importedCount > 0) {
      this.transactionsGateway.emitTransactionsChanged(userId, {
        action: 'IMPORTED',
        source: 'BANK_IMPORT',
        count: importedCount,
      })
    }

    emitImportProgress('COMPLETED', 'Importacao concluida.')

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

    const candidates = await this.transactionsRepo.findMany({
      where: {
        userId,
        bankAccountId,
        type,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        id: true,
        name: true,
        value: true,
      },
    })

    const targetValueInCents = toMoneyCents(value)

    const duplicate = candidates.find((candidate) => {
      const candidateValueInCents = toMoneyCents(Number(candidate.value))

      if (candidateValueInCents !== targetValueInCents) {
        return false
      }

      if (!matchByName) {
        return true
      }

      return isDuplicateNameEquivalent(candidate.name, name)
    })

    if (!duplicate) {
      return null
    }

    return {
      id: duplicate.id,
    }
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
      ? `Transferencia recebida de conta propria${currentAccountName ? ` (${currentAccountName})` : ''}`
      : `Transferencia enviada para conta propria${currentAccountName ? ` (${currentAccountName})` : ''}`

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

}
