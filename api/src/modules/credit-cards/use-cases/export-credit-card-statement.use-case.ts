import { Injectable } from '@nestjs/common'
import { SupportedCreditCardStatementProvider } from '../dto/import-credit-card-statement.dto'
import { FindCreditCardStatementByMonthUseCase } from './find-credit-card-statement-by-month.use-case'

@Injectable()
export class ExportCreditCardStatementUseCase {
  constructor(
    private readonly findCreditCardStatementByMonthUseCase: FindCreditCardStatementByMonthUseCase,
  ) {}

  async execute(
    userId: string,
    creditCardId: string,
    { month, year }: { month: number; year: number },
  ) {
    const statement = await this.findCreditCardStatementByMonthUseCase.execute(userId, creditCardId, {
      month,
      year,
    })

    const rows = statement.installments
      .filter((installment) => installment.status !== 'CANCELED')
      .map((installment) => {
        const purchaseDate = new Date(installment.purchaseDate)
        const day = String(purchaseDate.getUTCDate()).padStart(2, '0')
        const monthValue = String(purchaseDate.getUTCMonth() + 1).padStart(2, '0')
        const yearValue = purchaseDate.getUTCFullYear()
        const formattedDate = `${day}/${monthValue}/${yearValue}`
        const formattedValue = installment.amount.toFixed(2).replace('.', ',')

        return [
          formattedDate,
          formattedValue,
          installment.description,
          installment.id,
        ]
      })

    const header = ['Data', 'Valor', 'Descrição', 'Identificador']
    const allRows = [header, ...rows]
    const csvContent = allRows.map((columns) => (
      columns.map((column) => this.escapeCsvCell(column)).join(',')
    )).join('\n')

    const fileName = `fatura-${statement.card.name.toLowerCase().replace(/\s+/g, '-')}-${String(month + 1).padStart(2, '0')}-${year}.csv`

    return {
      bank: SupportedCreditCardStatementProvider.NUBANK,
      fileName,
      csvContent,
      totalRows: rows.length,
    }
  }

  private escapeCsvCell(value: string) {
    const normalizedValue = String(value ?? '')

    if (
      normalizedValue.includes(',')
      || normalizedValue.includes('"')
      || normalizedValue.includes('\n')
    ) {
      return `"${normalizedValue.replace(/"/g, '""')}"`
    }

    return normalizedValue
  }
}
