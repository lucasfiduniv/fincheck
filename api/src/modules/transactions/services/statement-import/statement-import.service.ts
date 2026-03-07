import { BadRequestException, Injectable } from '@nestjs/common'
import { SupportedBankStatementProvider } from '../../dto/import-bank-statement.dto'
import { NubankStatementParser } from './parsers/nubank-statement.parser'
import { NubankOfxStatementParser } from './parsers/nubank-ofx-statement.parser'
import { BancoDoBrasilOfxStatementParser } from './parsers/banco-do-brasil-ofx-statement.parser'
import { SicoobPdfStatementParser } from './parsers/sicoob-pdf-statement.parser'
import { ParsedStatementEntry } from './statement-import.types'

@Injectable()
export class StatementImportService {
  private readonly parsers = [
    this.nubankParser,
    this.nubankOfxParser,
    this.bancoDoBrasilOfxParser,
    this.sicoobPdfParser,
  ]

  constructor(
    private readonly nubankParser: NubankStatementParser,
    private readonly nubankOfxParser: NubankOfxStatementParser,
    private readonly bancoDoBrasilOfxParser: BancoDoBrasilOfxStatementParser,
    private readonly sicoobPdfParser: SicoobPdfStatementParser,
  ) {}

  async parse(provider: SupportedBankStatementProvider, content: string) {
    const parser = this.parsers.find((supportedParser) => (
      supportedParser.provider === provider
      && supportedParser.canParse(content)
    ))

    if (!parser) {
      throw new BadRequestException('Formato de arquivo não suportado para este banco.')
    }

    const parsedEntries = await parser.parse(content)

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
