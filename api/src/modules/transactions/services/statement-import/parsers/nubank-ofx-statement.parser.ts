import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../../dto/import-bank-statement.dto'
import {
  BankStatementParser,
  ParsedStatementEntry,
} from '../statement-import.types'

@Injectable()
export class NubankOfxStatementParser implements BankStatementParser {
  readonly provider = SupportedBankStatementProvider.NUBANK

  canParse(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim().toUpperCase()

    return normalizedContent.includes('<OFX>') && normalizedContent.includes('<STMTTRN>')
  }

  async parse(content: string): Promise<ParsedStatementEntry[]> {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim()

    if (!normalizedContent) {
      throw new BadRequestException('Arquivo vazio. Envie um extrato válido.')
    }

    const statementBlocks = normalizedContent.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? []

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

      const parsedDate = this.parseDate(dateRaw)
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

    return entries
  }

  private parseDate(value: string) {
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

  private extractTagValue(content: string, tagName: string) {
    const regex = new RegExp(`<${tagName}>([^\r\n<]+)`, 'i')
    const match = content.match(regex)

    return match?.[1]?.trim()
  }
}
