export type FinancialImportSource = 'BANK_STATEMENT' | 'CREDIT_CARD_STATEMENT'

export interface FinancialImportCompletedDetail {
  source: FinancialImportSource
  importedCount: number
}

export const FINANCIAL_IMPORT_COMPLETED_EVENT = 'financial-import-completed'

export function notifyFinancialImportCompleted(detail: FinancialImportCompletedDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<FinancialImportCompletedDetail>(FINANCIAL_IMPORT_COMPLETED_EVENT, {
      detail,
    }),
  )
}
