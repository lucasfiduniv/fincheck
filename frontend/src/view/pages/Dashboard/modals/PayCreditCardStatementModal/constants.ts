import { MONTHS } from '../../../../../app/config/constants'

export const LINKED_BANK_ACCOUNT_OPTION = 'LINKED'

export const PAY_STATEMENT_MONTH_OPTIONS = MONTHS.map((month, index) => ({
  value: String(index),
  label: month,
}))