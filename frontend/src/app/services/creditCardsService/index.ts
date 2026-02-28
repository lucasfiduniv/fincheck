import { create } from './create'
import { createPurchase } from './createPurchase'
import { getAll } from './getAll'
import { getStatementByMonth } from './getStatementByMonth'
import { payStatement } from './payStatement'
import { update } from './update'

export const creditCardsService = {
  create,
  createPurchase,
  getAll,
  getStatementByMonth,
  payStatement,
  update,
}
