import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../../dto/import-bank-statement.dto'
import {
  BankStatementParser,
  ParsedStatementEntry,
} from '../statement-import.types'

@Injectable()
export class BancoDoBrasilOfxStatementParser implements BankStatementParser {
  readonly provider = SupportedBankStatementProvider.BANCO_DO_BRASIL

  canParse(content: string) {
    const normalizedContent = content.replace(/^\uFEFF/, '').trim().toUpperCase()

    if (!normalizedContent.includes('<OFX>') || !normalizedContent.includes('<BANKMSGSRSV1>')) {
      return false
    }

    return normalizedContent.includes('BANCO DO BRASIL')
      || normalizedContent.includes('<BANKID>1</BANKID>')
  }

  parse(content: string): ParsedStatementEntry[] {
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
      const amountRaw = this.extractTagValue(block, 'TRNAMT')

      if (!amountRaw) {
        continue
      }

      const parsedValue = Number(amountRaw.replace(',', '.'))

      if (Number.isNaN(parsedValue) || parsedValue === 0) {
        continue
      }

      const dateRaw = this.extractTagValue(block, 'DTPOSTED')
      const name = this.extractTagValue(block, 'NAME')
      const memo = this.extractTagValue(block, 'MEMO')
      const fitId = this.extractTagValue(block, 'FITID')

      if (!dateRaw) {
        continue
      }

      const parsedDate = this.parseDate(dateRaw)

      if (!parsedDate) {
        continue
      }

      const description = this.buildDescription(name, memo)

      if (!description) {
        continue
      }

      entries.push({
        date: parsedDate,
        value: parsedValue,
        description,
        externalId: fitId?.trim() || undefined,
      })
    }

    return entries
  }

  private parseDate(value: string) {
    const datePortion = value.slice(0, 8)

    if (datePortion.length < 8 || !/^\d{8}$/.test(datePortion)) {
      return null
    }

    const year = Number(datePortion.slice(0, 4))
    const month = Number(datePortion.slice(4, 6))
    const day = Number(datePortion.slice(6, 8))

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
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

  private buildDescription(name?: string, memo?: string) {
    const normalizedName = this.normalizeText(name)
    const normalizedMemo = this.normalizeText(memo)

    if (normalizedName && normalizedMemo) {
      const nameLower = normalizedName.toLowerCase()
      const memoLower = normalizedMemo.toLowerCase()

      if (nameLower.includes(memoLower) || memoLower.includes(nameLower)) {
        return normalizedName.length >= normalizedMemo.length ? normalizedName : normalizedMemo
      }

      return `${normalizedName} - ${normalizedMemo}`
    }

    return normalizedName || normalizedMemo
  }

  private normalizeText(value?: string) {
    return (value ?? '').replace(/\s+/g, ' ').trim()
  }

  private extractTagValue(content: string, tagName: string) {
    const regex = new RegExp(`<${tagName}>([^\r\n<]*)`, 'i')
    const match = content.match(regex)

    return match?.[1]?.trim()
  }
}
