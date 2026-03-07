import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import {
  ImportCreditCardStatementDto,
  SupportedCreditCardStatementProvider,
} from '../dto/import-credit-card-statement.dto'

type ParsedStatementEntry = {
  date: Date
  value: number
  description: string
  externalId?: string
}

@Injectable()
export class ImportCreditCardStatementUseCase {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
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

    let importedCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (const entry of uniqueEntries) {
      const amount = Number(Math.abs(entry.value).toFixed(2))

      if (!Number.isFinite(amount) || amount <= 0) {
        skippedCount += 1
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
        const normalizedPurchaseDate = new Date(Date.UTC(
          entry.date.getUTCFullYear(),
          entry.date.getUTCMonth(),
          entry.date.getUTCDate(),
        ))

        const purchase = await this.creditCardPurchasesRepo.create({
          data: {
            userId,
            creditCardId,
            description: entry.description,
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
    }

    return {
      bank: importCreditCardStatementDto.bank,
      totalRows: parsedEntries.length,
      uniqueRows: uniqueEntries.length,
      importedCount,
      skippedCount,
      failedCount,
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
}
