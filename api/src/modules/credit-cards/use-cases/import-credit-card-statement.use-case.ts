import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import {
  ImportCreditCardStatementDto,
  SupportedCreditCardStatementProvider,
} from '../dto/import-credit-card-statement.dto'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { TransactionsGateway } from '../../transactions/transactions.gateway'

type ParsedStatementEntryKind = 'PURCHASE' | 'PAYMENT' | 'CREDIT_ADJUSTMENT'

type ParsedStatementEntry = {
  date: Date
  value: number
  description: string
  externalId?: string
  kind: ParsedStatementEntryKind
}

@Injectable()
export class ImportCreditCardStatementUseCase {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
    private readonly transactionsGateway: TransactionsGateway,
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

    if (importCreditCardStatementDto.bank !== SupportedCreditCardStatementProvider.NUBANK) {
      throw new BadRequestException('Banco de fatura não suportado para cartão.')
    }

    const parsedEntries = this.parseNubankStatement(importCreditCardStatementDto.csvContent)
    const uniqueEntries = this.dedupeStatementEntries(parsedEntries)

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
      const identityKey = this.getEntryIdentityKey(entry)
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
              const wasApplied = await this.applyImportedPayment({
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
            skippedCount += 1
            continue
          }

          try {
            const entryIdentityKey = this.getEntryIdentityKey(entry)
            const aiIndexesForEntry = purchaseAiIndexesByIdentity.get(entryIdentityKey) ?? []
            const aiIndex = aiIndexesForEntry.shift()

            if (aiIndexesForEntry.length > 0) {
              purchaseAiIndexesByIdentity.set(entryIdentityKey, aiIndexesForEntry)
            } else {
              purchaseAiIndexesByIdentity.delete(entryIdentityKey)
            }

            const aiSuggestion = aiIndex != null ? aiSuggestions.get(aiIndex) : undefined

            const normalizedDescription = aiSuggestion?.normalizedDescription?.trim()
              || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(entry.description)
            const categoryId = aiSuggestion?.categoryId

            const normalizedPurchaseDate = new Date(Date.UTC(
              entry.date.getUTCFullYear(),
              entry.date.getUTCMonth(),
              entry.date.getUTCDate(),
            ))

            const purchase = await this.creditCardPurchasesRepo.create({
              data: {
                userId,
                creditCardId,
                categoryId,
                description: normalizedDescription,
                amount,
                purchaseDate: normalizedPurchaseDate,
                type: 'ONE_TIME',
                installmentCount: 1,
              },
            })

            const firstStatement = this.resolveStatementForPurchase(
              normalizedPurchaseDate,
              card.closingDay,
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
                  dueDate: this.buildDueDate(firstStatement.year, firstStatement.month, card.dueDay),
                },
              ],
            })

            importedCount += 1
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

  private getEntryIdentityKey(entry: ParsedStatementEntry) {
    return [
      entry.date.toISOString().slice(0, 10),
      entry.value.toFixed(2),
      entry.description.trim().toLowerCase(),
      entry.externalId ?? '',
    ].join('|')
  }

  private async applyImportedPayment({
    userId,
    creditCardId,
    cardName,
    linkedBankAccountId,
    entry,
    amount,
  }: {
    userId: string
    creditCardId: string
    cardName: string
    linkedBankAccountId: string
    entry: ParsedStatementEntry
    amount: number
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

    const duplicatePaymentTransaction = await this.transactionsRepo.findFirst({
      where: {
        userId,
        bankAccountId: linkedBankAccountId,
        type: 'EXPENSE',
        value: amount,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
        name: {
          startsWith: `Pagamento fatura ${cardName}`,
        },
      },
      select: {
        id: true,
      },
    })

    if (duplicatePaymentTransaction) {
      return false
    }

    const pendingInstallments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        status: 'PENDING',
      },
      orderBy: [
        { dueDate: 'asc' },
        { statementYear: 'asc' },
        { statementMonth: 'asc' },
        { installmentNumber: 'asc' },
      ],
      select: {
        id: true,
        amount: true,
      },
    })

    if (!pendingInstallments.length) {
      return false
    }

    const totalPending = Number(
      pendingInstallments
        .reduce((acc, installment) => acc + installment.amount, 0)
        .toFixed(2),
    )

    if (totalPending <= 0) {
      return false
    }

    const totalToPay = Math.min(amount, totalPending)
    const { fullyPaidInstallmentIds, partialInstallmentAdjustment } =
      this.allocateStatementPayment(pendingInstallments, totalToPay)

    if (!fullyPaidInstallmentIds.length && !partialInstallmentAdjustment) {
      return false
    }

    const paymentTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: linkedBankAccountId,
        categoryId: null,
        name: `Pagamento fatura ${cardName} ${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}/${entry.date.getUTCFullYear()}`,
        value: totalToPay,
        date: dayStart,
        type: 'EXPENSE',
        status: 'POSTED',
        entryType: 'SINGLE',
      },
    })

    if (fullyPaidInstallmentIds.length > 0) {
      await this.creditCardInstallmentsRepo.updateMany({
        where: {
          id: {
            in: fullyPaidInstallmentIds,
          },
        },
        data: {
          status: 'PAID',
          paidAt: dayStart,
          paymentTransactionId: paymentTransaction.id,
        },
      })
    }

    if (partialInstallmentAdjustment) {
      await this.creditCardInstallmentsRepo.update({
        where: {
          id: partialInstallmentAdjustment.installmentId,
        },
        data: {
          amount: partialInstallmentAdjustment.newAmount,
        },
      })
    }

    return true
  }

  private allocateStatementPayment(
    pendingInstallments: Array<{ id: string; amount: number }>,
    paymentAmount: number,
  ) {
    const fullyPaidInstallmentIds: string[] = []
    let partialInstallmentAdjustment:
      | { installmentId: string; newAmount: number }
      | null = null

    let remainingPaymentAmountCents = Math.round(paymentAmount * 100)

    for (const installment of pendingInstallments) {
      if (remainingPaymentAmountCents <= 0) {
        break
      }

      const installmentAmountCents = Math.round(installment.amount * 100)

      if (remainingPaymentAmountCents >= installmentAmountCents) {
        fullyPaidInstallmentIds.push(installment.id)
        remainingPaymentAmountCents -= installmentAmountCents
      } else {
        const newAmount = Number(
          ((installmentAmountCents - remainingPaymentAmountCents) / 100).toFixed(2),
        )

        partialInstallmentAdjustment = {
          installmentId: installment.id,
          newAmount,
        }
        remainingPaymentAmountCents = 0
      }
    }

    return {
      fullyPaidInstallmentIds,
      partialInstallmentAdjustment,
    }
  }

  private resolveStatementForPurchase(date: Date, closingDay: number) {
    const day = date.getUTCDate()

    if (day > closingDay) {
      return this.addMonthsToStatement(
        {
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
        1,
      )
    }

    return {
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    }
  }

  private addMonthsToStatement(
    statement: { month: number; year: number },
    monthsToAdd: number,
  ) {
    const computedDate = new Date(Date.UTC(statement.year, statement.month + monthsToAdd, 1))

    return {
      month: computedDate.getUTCMonth(),
      year: computedDate.getUTCFullYear(),
    }
  }

  private buildDueDate(year: number, month: number, dueDay: number) {
    const maxDayInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const normalizedDay = Math.min(dueDay, maxDayInMonth)

    return new Date(Date.UTC(year, month, normalizedDay))
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

  private parseNubankStatement(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim()

    if (!normalizedContent) {
      throw new BadRequestException('Arquivo vazio. Envie uma fatura válida.')
    }

    if (normalizedContent.toUpperCase().includes('<OFX>')) {
      return this.parseNubankOfxStatement(normalizedContent)
    }

    return this.parseNubankCsvStatement(normalizedContent)
  }

  private parseNubankCsvStatement(csvContent: string): ParsedStatementEntry[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      throw new BadRequestException('Arquivo sem lançamentos para importar.')
    }

    const headers = this.parseCsvLine(lines[0]).map((header) => this.normalizeHeader(header))

    const dateIndex = headers.findIndex((header) => header === 'data')
    const valueIndex = headers.findIndex((header) => header === 'valor')
    const descriptionIndex = headers.findIndex((header) => header === 'descricao')
    const identifierIndex = headers.findIndex((header) => header === 'identificador')

    if (dateIndex < 0 || valueIndex < 0 || descriptionIndex < 0) {
      throw new BadRequestException('Formato Nubank inválido. Esperado: Data, Valor e Descrição.')
    }

    const entries: ParsedStatementEntry[] = []

    for (let index = 1; index < lines.length; index++) {
      const columns = this.parseCsvLine(lines[index])

      const dateValue = columns[dateIndex]?.trim()
      const valueText = columns[valueIndex]?.trim()
      const description = columns[descriptionIndex]?.trim()
      const externalId = identifierIndex >= 0 ? columns[identifierIndex]?.trim() : undefined

      if (!dateValue || !valueText || !description) {
        continue
      }

      const parsedDate = this.parseBrDate(dateValue)
      const parsedValue = this.parseCurrency(valueText)

      if (Number.isNaN(parsedValue) || parsedValue === 0) {
        continue
      }

      entries.push({
        date: parsedDate,
        value: parsedValue,
        description,
        externalId: externalId || undefined,
        kind: this.classifyEntryByAmount(parsedValue, description),
      })
    }

    if (entries.length === 0) {
      throw new BadRequestException('Nenhum lançamento válido encontrado no arquivo.')
    }

    return entries
  }

  private parseNubankOfxStatement(content: string): ParsedStatementEntry[] {
    const statementBlocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? []

    if (!statementBlocks.length) {
      throw new BadRequestException('OFX sem lançamentos para importar.')
    }

    const entries: ParsedStatementEntry[] = []

    for (const block of statementBlocks) {
      const dateRaw = this.extractTagValue(block, 'DTPOSTED')
      const amountRaw = this.extractTagValue(block, 'TRNAMT')
      const memo = this.extractTagValue(block, 'MEMO')
      const fitId = this.extractTagValue(block, 'FITID')
      const trnTypeRaw = this.extractTagValue(block, 'TRNTYPE')

      if (!dateRaw || !amountRaw || !memo) {
        continue
      }

      const parsedDate = this.parseOfxDate(dateRaw)
      const parsedValue = Number(amountRaw)

      if (Number.isNaN(parsedValue) || parsedValue === 0) {
        continue
      }

      entries.push({
        date: parsedDate,
        value: parsedValue,
        description: memo.trim(),
        externalId: fitId?.trim() || undefined,
        kind: this.classifyOfxEntry(parsedValue, memo.trim(), trnTypeRaw),
      })
    }

    if (entries.length === 0) {
      throw new BadRequestException('Nenhum lançamento válido encontrado no OFX.')
    }

    return entries
  }

  private dedupeStatementEntries(entries: ParsedStatementEntry[]) {
    const seen = new Set<string>()

    return entries.filter((entry) => {
      const key = [
        entry.date.toISOString().slice(0, 10),
        entry.value.toFixed(2),
        entry.description.trim().toLowerCase(),
        entry.externalId ?? '',
      ].join('|')

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }

  private parseBrDate(value: string) {
    const [day, month, year] = value.split('/').map(Number)

    if (!day || !month || !year) {
      throw new BadRequestException(`Data inválida no CSV: ${value}`)
    }

    return new Date(Date.UTC(year, month - 1, day))
  }

  private parseOfxDate(value: string) {
    const datePortion = value.slice(0, 8)

    if (datePortion.length < 8) {
      throw new BadRequestException(`Data inválida no OFX: ${value}`)
    }

    const year = Number(datePortion.slice(0, 4))
    const month = Number(datePortion.slice(4, 6))
    const day = Number(datePortion.slice(6, 8))

    if (!year || !month || !day) {
      throw new BadRequestException(`Data inválida no OFX: ${value}`)
    }

    return new Date(Date.UTC(year, month - 1, day))
  }

  private parseCurrency(value: string) {
    const digitsAndSeparators = value.replace(/[^\d.,-]/g, '')

    if (!digitsAndSeparators) {
      return Number.NaN
    }

    const hasComma = digitsAndSeparators.includes(',')
    const hasDot = digitsAndSeparators.includes('.')

    if (hasComma && hasDot) {
      return Number(digitsAndSeparators.replace(/\./g, '').replace(',', '.'))
    }

    if (hasComma) {
      return Number(digitsAndSeparators.replace(',', '.'))
    }

    return Number(digitsAndSeparators)
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
  }

  private parseCsvLine(line: string) {
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index++) {
      const char = line[index]

      if (char === '"') {
        const isEscapedQuote = line[index + 1] === '"'

        if (isEscapedQuote) {
          currentValue += '"'
          index += 1
          continue
        }

        inQuotes = !inQuotes
        continue
      }

      if (char === ',' && !inQuotes) {
        values.push(currentValue)
        currentValue = ''
        continue
      }

      currentValue += char
    }

    values.push(currentValue)

    return values
  }

  private extractTagValue(content: string, tagName: string) {
    const regex = new RegExp(`<${tagName}>([^\r\n<]+)`, 'i')
    const match = content.match(regex)

    return match?.[1]?.trim()
  }

  private classifyOfxEntry(value: number, description: string, trnTypeRaw?: string) {
    const trnType = trnTypeRaw?.trim().toUpperCase()

    if (value < 0) {
      return 'PURCHASE' as const
    }

    if (trnType === 'CREDIT' && this.isCardPaymentDescription(description)) {
      return 'PAYMENT' as const
    }

    if (value > 0 && this.isCardPaymentDescription(description)) {
      return 'PAYMENT' as const
    }

    return 'CREDIT_ADJUSTMENT' as const
  }

  private classifyEntryByAmount(value: number, description: string) {
    if (value < 0) {
      return 'PURCHASE' as const
    }

    if (value > 0 && this.isCardPaymentDescription(description)) {
      return 'PAYMENT' as const
    }

    return 'CREDIT_ADJUSTMENT' as const
  }

  private isCardPaymentDescription(description: string) {
    const normalized = description
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()

    return normalized.includes('pagamento recebido')
      || normalized.includes('pagamento fatura')
      || normalized.includes('pagamento da fatura')
      || normalized.includes('pagamento cartao')
      || normalized.includes('payment received')
  }
}
