import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../../dto/import-bank-statement.dto'
import {
  BankStatementParser,
  ParsedStatementEntry,
} from '../statement-import.types'

const pdfParse: (dataBuffer: Buffer) => Promise<{ text?: string }> = require('pdf-parse')

@Injectable()
export class SicoobPdfStatementParser implements BankStatementParser {
  readonly provider = SupportedBankStatementProvider.SICOOB

  canParse(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim().toLowerCase()

    return normalizedContent.startsWith('data:application/pdf;base64,')
      || normalizedContent.startsWith('data:application/octet-stream;base64,')
      || normalizedContent.includes('%pdf-')
  }

  async parse(content: string): Promise<ParsedStatementEntry[]> {
    const pdfBuffer = this.extractPdfBuffer(content)

    if (!pdfBuffer) {
      throw new BadRequestException('Arquivo PDF inválido para importação do Sicoob.')
    }

    const parsedPdf = await pdfParse(pdfBuffer)
    const text = (parsedPdf.text ?? '').replace(/\u00A0/g, ' ')

    if (!text.trim()) {
      throw new BadRequestException('Não foi possível extrair texto do PDF do Sicoob.')
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    const entries: ParsedStatementEntry[] = []

    for (const line of lines) {
      const parsedEntry = this.parseLine(line)

      if (!parsedEntry) {
        continue
      }

      entries.push(parsedEntry)
    }

    if (!entries.length) {
      throw new BadRequestException(
        'Nenhum lançamento válido foi encontrado no PDF do Sicoob. Verifique se o arquivo contém a tabela de movimentações.',
      )
    }

    return entries
  }

  private parseLine(line: string): ParsedStatementEntry | null {
    const dateMatch = line.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)

    if (!dateMatch) {
      return null
    }

    const dateValue = this.parseDate(dateMatch[1])

    if (!dateValue) {
      return null
    }

    const amountMatches = Array.from(
      line.matchAll(/-?\s*R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}-?|\b-?\d{1,3}(?:\.\d{3})*,\d{2}-?\b/g),
    )

    if (!amountMatches.length) {
      return null
    }

    const rawAmount = amountMatches[amountMatches.length - 1][0]
    const amount = this.parseCurrency(rawAmount, line)

    if (Number.isNaN(amount) || amount === 0) {
      return null
    }

    const description = line
      .replace(dateMatch[1], ' ')
      .replace(rawAmount, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!description) {
      return null
    }

    const externalId = `${dateMatch[1]}|${rawAmount}|${description}`

    return {
      date: dateValue,
      value: amount,
      description,
      externalId,
    }
  }

  private parseCurrency(rawValue: string, line: string) {
    const cleanedValue = rawValue.replace(/\s+/g, '')
    const numericValue = cleanedValue
      .replace(/R\$/gi, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/-$/, '')

    const parsedNumber = Number(numericValue)

    if (Number.isNaN(parsedNumber)) {
      return Number.NaN
    }

    const normalizedLine = this.normalizeText(line)
    const hasExplicitNegative = cleanedValue.startsWith('-') || cleanedValue.endsWith('-')

    if (hasExplicitNegative) {
      return -Math.abs(parsedNumber)
    }

    const looksLikeExpense =
      normalizedLine.includes('debito')
      || normalizedLine.includes('pagamento')
      || normalizedLine.includes('pix enviado')
      || normalizedLine.includes('transferencia enviada')
      || normalizedLine.includes('compra')
      || normalizedLine.includes('saida')

    const looksLikeIncome =
      normalizedLine.includes('credito')
      || normalizedLine.includes('recebido')
      || normalizedLine.includes('recebimento')
      || normalizedLine.includes('entrada')
      || normalizedLine.includes('deposito')

    if (looksLikeExpense && !looksLikeIncome) {
      return -Math.abs(parsedNumber)
    }

    return parsedNumber
  }

  private parseDate(value: string) {
    const [day, month, year] = value.split('/').map(Number)

    if (!day || !month || !year) {
      return null
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day))

    if (
      parsedDate.getUTCFullYear() !== year
      || parsedDate.getUTCMonth() !== month - 1
      || parsedDate.getUTCDate() !== day
    ) {
      return null
    }

    return parsedDate
  }

  private extractPdfBuffer(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim()

    if (normalizedContent.startsWith('data:')) {
      const base64Content = normalizedContent.split(',')[1]

      if (!base64Content) {
        return null
      }

      return Buffer.from(base64Content, 'base64')
    }

    if (normalizedContent.includes('%PDF-')) {
      return Buffer.from(normalizedContent)
    }

    return null
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
