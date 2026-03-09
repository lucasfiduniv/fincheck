import { Injectable } from '@nestjs/common'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import {
  CreditCardStatementParserService,
  ParsedStatementEntry,
} from './credit-card-statement-parser.service'
import { CreditCardStatementScheduleService } from './credit-card-statement-schedule.service'

type AiSuggestion = {
  normalizedDescription?: string
  categoryId?: string
}

@Injectable()
export class CreditCardStatementPurchaseImportService {
  constructor(
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly creditCardStatementParserService: CreditCardStatementParserService,
    private readonly creditCardStatementScheduleService: CreditCardStatementScheduleService,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
  ) {}

  async importPurchaseEntry({
    userId,
    creditCardId,
    cardClosingDay,
    cardDueDay,
    entry,
    amount,
    aiSuggestions,
    purchaseAiIndexesByIdentity,
  }: {
    userId: string
    creditCardId: string
    cardClosingDay: number
    cardDueDay: number
    entry: ParsedStatementEntry
    amount: number
    aiSuggestions: Map<number, AiSuggestion>
    purchaseAiIndexesByIdentity: Map<string, number[]>
  }) {
    const dayStart = new Date(Date.UTC(
      entry.date.getUTCFullYear(),
      entry.date.getUTCMonth(),
      entry.date.getUTCDate(),
    ))
    const dayEnd = new Date(Date.UTC(
      entry.date.getUTCFullYear(),
      entry.date.getUTCMonth(),
      entry.date.getUTCDate() + 1,
    ))

    const duplicate = await this.creditCardPurchasesRepo.findFirst({
      where: {
        userId,
        creditCardId,
        description: entry.description,
        amount,
        purchaseDate: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: { id: true },
    })

    if (duplicate) {
      return false
    }

    const { normalizedDescription, categoryId } = this.resolveAiSuggestionForEntry(
      entry,
      aiSuggestions,
      purchaseAiIndexesByIdentity,
    )

    const purchase = await this.creditCardPurchasesRepo.create({
      data: {
        userId,
        creditCardId,
        categoryId,
        description: normalizedDescription,
        amount,
        purchaseDate: dayStart,
        type: 'ONE_TIME',
        installmentCount: 1,
      },
    })

    const firstStatement = this.creditCardStatementScheduleService.resolveStatementForPurchase(
      dayStart,
      cardClosingDay,
    )

    await this.creditCardInstallmentsRepo.createMany({
      data: [
        {
          userId,
          creditCardId,
          purchaseId: purchase.id,
          installmentNumber: 1,
          installmentCount: 1,
          amount,
          statementMonth: firstStatement.month,
          statementYear: firstStatement.year,
          dueDate: this.creditCardStatementScheduleService.buildDueDate(
            firstStatement.year,
            firstStatement.month,
            cardDueDay,
          ),
        },
      ],
    })

    return true
  }

  private resolveAiSuggestionForEntry(
    entry: ParsedStatementEntry,
    aiSuggestions: Map<number, AiSuggestion>,
    purchaseAiIndexesByIdentity: Map<string, number[]>,
  ) {
    const entryIdentityKey = this.creditCardStatementParserService.getEntryIdentityKey(entry)
    const aiIndexesForEntry = purchaseAiIndexesByIdentity.get(entryIdentityKey) ?? []
    const aiIndex = aiIndexesForEntry.shift()

    if (aiIndexesForEntry.length > 0) {
      purchaseAiIndexesByIdentity.set(entryIdentityKey, aiIndexesForEntry)
    } else {
      purchaseAiIndexesByIdentity.delete(entryIdentityKey)
    }

    const aiSuggestion = aiIndex != null ? aiSuggestions.get(aiIndex) : undefined

    return {
      normalizedDescription: aiSuggestion?.normalizedDescription?.trim()
        || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(entry.description),
      categoryId: aiSuggestion?.categoryId,
    }
  }
}