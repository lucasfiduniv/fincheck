import { create } from './create'
import { cancelPurchase } from './cancelPurchase'
import { createPurchase } from './createPurchase'
import { getAll } from './getAll'
import { getStatementByMonth } from './getStatementByMonth'
import { payStatement } from './payStatement'
import { update } from './update'

export const creditCardsService = {
  cancelPurchase,
  create,
  createPurchase,
  getAll,
  getStatementByMonth,
  payStatement,
  update,
}
