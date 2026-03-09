import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedCreditCardStatementProvider } from '../dto/import-credit-card-statement.dto'

export type ParsedStatementEntryKind = 'PURCHASE' | 'PAYMENT' | 'CREDIT_ADJUSTMENT'

export type ParsedStatementEntry = {
  date: Date
  value: number
  description: string
  externalId?: string
  kind: ParsedStatementEntryKind
}

@Injectable()
export class CreditCardStatementParserService {
  parseStatement(
    bank: SupportedCreditCardStatementProvider,
    content: string,
  ): ParsedStatementEntry[] {
    if (bank !== SupportedCreditCardStatementProvider.NUBANK) {
      throw new BadRequestException('Banco de fatura não suportado para cartão.')
    }

    const normalizedContent = content.replace(/^\uFEFF/, '').trim()

    if (!normalizedContent) {
      throw new BadRequestException('Arquivo vazio. Envie uma fatura válida.')
    }

    if (normalizedContent.toUpperCase().includes('<OFX>')) {
      return this.parseNubankOfxStatement(normalizedContent)
    }

    return this.parseNubankCsvStatement(normalizedContent)
  }

  dedupeEntries(entries: ParsedStatementEntry[]) {
    const seen = new Set<string>()

    return entries.filter((entry) => {
      const key = this.getEntryIdentityKey(entry)

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }

  getEntryIdentityKey(entry: ParsedStatementEntry) {
    return [
      entry.date.toISOString().slice(0, 10),
      entry.value.toFixed(2),
      entry.description.trim().toLowerCase(),
      entry.externalId ?? '',
    ].join('|')
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
