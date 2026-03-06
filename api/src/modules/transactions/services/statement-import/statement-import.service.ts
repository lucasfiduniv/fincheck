import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../dto/import-bank-statement.dto'
import { NubankStatementParser } from './parsers/nubank-statement.parser'
import { NubankOfxStatementParser } from './parsers/nubank-ofx-statement.parser'
import { ParsedStatementEntry } from './statement-import.types'

@Injectable()
export class StatementImportService {
  private readonly parsers = [
    this.nubankParser,
    this.nubankOfxParser,
  ]

  constructor(
    private readonly nubankParser: NubankStatementParser,
    private readonly nubankOfxParser: NubankOfxStatementParser,
  ) {}

  parse(provider: SupportedBankStatementProvider, csvContent: string) {
    const parser = this.parsers.find((supportedParser) => (
      supportedParser.provider === provider
      && supportedParser.canParse(csvContent)
    ))

    if (!parser) {
      throw new BadRequestException('Formato de arquivo não suportado para este banco.')
    }

    const parsedEntries = parser.parse(csvContent)

    if (parsedEntries.length === 0) {
      throw new BadRequestException('Nenhum lançamento válido encontrado no arquivo.')
    }

    return parsedEntries
  }

  static dedupeEntries(entries: ParsedStatementEntry[]) {
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
}
