import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../../dto/import-bank-statement.dto'
import {
  BankStatementParser,
  ParsedStatementEntry,
} from '../statement-import.types'

@Injectable()
export class NubankStatementParser implements BankStatementParser {
  readonly provider = SupportedBankStatementProvider.NUBANK

  canParse(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim()

    if (!normalizedContent) {
      return false
    }

    if (normalizedContent.toUpperCase().includes('<OFX>')) {
      return false
    }

    const firstLine = normalizedContent.split(/\r?\n/)[0] ?? ''
    const normalizedHeader = this.normalizeHeader(firstLine)

    return normalizedHeader.includes('data')
      && normalizedHeader.includes('valor')
      && normalizedHeader.includes('descricao')
  }

  parse(csvContent: string): ParsedStatementEntry[] {
    const normalizedContent = csvContent.replace(/^\uFEFF/, '').trim()

    if (!normalizedContent) {
      throw new BadRequestException('Arquivo vazio. Envie um extrato válido.')
    }

    const lines = normalizedContent
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
      throw new BadRequestException(
        'Formato Nubank inválido. Esperado cabeçalho com Data, Valor e Descrição.',
      )
    }

    const entries: ParsedStatementEntry[] = []

    for (let index = 1; index < lines.length; index++) {
      const line = lines[index]
      const columns = this.parseCsvLine(line)

      if (columns.length === 0) {
        continue
      }

      const dateValue = columns[dateIndex]?.trim()
      const valueText = columns[valueIndex]?.trim()
      const description = columns[descriptionIndex]?.trim()
      const externalId = identifierIndex >= 0 ? columns[identifierIndex]?.trim() : undefined

      if (!dateValue || !valueText || !description) {
        continue
      }

      const parsedDate = this.parseDate(dateValue)
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

    return entries
  }

  private parseDate(value: string) {
    const [day, month, year] = value.split('/').map(Number)

    if (!day || !month || !year) {
      throw new BadRequestException(`Data inválida no CSV: ${value}`)
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
}
