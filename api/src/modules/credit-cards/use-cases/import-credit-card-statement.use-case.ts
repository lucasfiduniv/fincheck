import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import {
  ImportCreditCardStatementDto,
} from '../dto/import-credit-card-statement.dto'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { TransactionsGateway } from '../../transactions/transactions.gateway'
import {
  CreditCardStatementParserService,
} from '../services/credit-card-statement-parser.service'
import { CreditCardStatementPaymentImportService } from '../services/credit-card-statement-payment-import.service'
import { CreditCardStatementPurchaseImportService } from '../services/credit-card-statement-purchase-import.service'

@Injectable()
export class ImportCreditCardStatementUseCase {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
    private readonly transactionsGateway: TransactionsGateway,
    private readonly creditCardStatementParserService: CreditCardStatementParserService,
    private readonly creditCardStatementPaymentImportService: CreditCardStatementPaymentImportService,
    private readonly creditCardStatementPurchaseImportService: CreditCardStatementPurchaseImportService,
  ) {}

  async execute(
    userId: string,
    creditCardId: string,
    importCreditCardStatementDto: ImportCreditCardStatementDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    if (!card.isActive) {
      throw new BadRequestException('Cartão inativo não pode receber importação de fatura.')
    }

    const parsedEntries = this.creditCardStatementParserService.parseStatement(
      importCreditCardStatementDto.bank,
      importCreditCardStatementDto.csvContent,
    )
    const uniqueEntries = this.creditCardStatementParserService.dedupeEntries(parsedEntries)

    const expenseCategories = await this.categoriesRepo.findMany({
      where: {
        userId,
        type: 'EXPENSE',
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    })

    const purchaseEntries = uniqueEntries
      .filter((entry) => entry.kind === 'PURCHASE')
      .map((entry, index) => ({
        ...entry,
        aiIndex: index,
      }))

    const purchaseAiIndexesByIdentity = new Map<string, number[]>()

    purchaseEntries.forEach((entry) => {
      const identityKey = this.creditCardStatementParserService.getEntryIdentityKey(entry)
      const currentIndexes = purchaseAiIndexesByIdentity.get(identityKey) ?? []

      currentIndexes.push(entry.aiIndex)
      purchaseAiIndexesByIdentity.set(identityKey, currentIndexes)
    })

    let aiSuggestions = new Map<number, {
      normalizedDescription?: string
      categoryId?: string
    }>()

    if (purchaseEntries.length > 0 && expenseCategories.length > 0) {
      try {
        aiSuggestions = await this.transactionImportAiEnrichmentService.enrichEntries({
          entries: purchaseEntries.map((entry) => ({
            index: entry.aiIndex,
            description: entry.description,
            type: 'EXPENSE',
            amount: Math.abs(entry.value),
          })),
          categories: expenseCategories.map((category) => ({
            id: category.id,
            name: category.name,
            type: 'EXPENSE' as const,
          })),
        })
      } catch {
        aiSuggestions = new Map()
      }
    }

    let importedCount = 0
    let importedPaymentsCount = 0
    let skippedCount = 0
    let failedCount = 0
    let processedRows = 0
    const totalRows = uniqueEntries.length
    const startedAt = Date.now()
    const requestId = importCreditCardStatementDto.requestId?.trim() || undefined

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
        source: 'CREDIT_CARD_STATEMENT',
        stage,
        requestId,
        creditCardId,
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

    emitImportProgress('STARTED', 'Importação da fatura iniciada.')

    try {
      for (const entry of uniqueEntries) {
        try {
          if (entry.kind === 'CREDIT_ADJUSTMENT') {
            skippedCount += 1
            continue
          }

          const amount = Number(Math.abs(entry.value).toFixed(2))

          if (!Number.isFinite(amount) || amount <= 0) {
            skippedCount += 1
            continue
          }

          if (entry.kind === 'PAYMENT') {
            try {
              const wasApplied = await this.creditCardStatementPaymentImportService.applyImportedPayment({
                userId,
                creditCardId,
                cardName: card.name,
                linkedBankAccountId: card.bankAccountId,
                entry,
                amount,
              })

              if (wasApplied) {
                importedPaymentsCount += 1
              } else {
                skippedCount += 1
              }
            } catch {
              failedCount += 1
            }

            continue
          }

          try {
            const importedPurchase = await this.creditCardStatementPurchaseImportService.importPurchaseEntry({
              userId,
              creditCardId,
              cardClosingDay: card.closingDay,
              cardDueDay: card.dueDay,
              entry,
              amount,
              aiSuggestions,
              purchaseAiIndexesByIdentity,
            })

            if (importedPurchase) {
              importedCount += 1
            } else {
              skippedCount += 1
            }
          } catch {
            failedCount += 1
          }
        } finally {
          processedRows += 1
          emitImportProgress('PROCESSING', 'Processando lançamentos da fatura...')
        }
      }
    } catch (error) {
      emitImportProgress('FAILED', 'Falha no processamento da fatura.')
      throw error
    }

    emitImportProgress('COMPLETED', 'Importação da fatura concluída.')

    return {
      bank: importCreditCardStatementDto.bank,
      totalRows: parsedEntries.length,
      uniqueRows: uniqueEntries.length,
      importedCount,
      importedPaymentsCount,
      skippedCount,
      failedCount,
    }
  }

  private async validateCreditCardOwnership(userId: string, creditCardId: string) {
    const creditCard = await this.creditCardsRepo.findFirst({
      where: {
        id: creditCardId,
        userId,
      },
    })

    if (!creditCard) {
      throw new NotFoundException('Credit card not found.')
    }

    return creditCard
  }

}
