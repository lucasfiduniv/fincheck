import { SupportedBankStatementProvider } from '../../dto/import-bank-statement.dto'

export interface ParsedStatementEntry {
  date: Date
  value: number
  description: string
  externalId?: string
}

export interface BankStatementParser {
  readonly provider: SupportedBankStatementProvider
  canParse(content: string): boolean
  parse(csvContent: string): ParsedStatementEntry[]
}
