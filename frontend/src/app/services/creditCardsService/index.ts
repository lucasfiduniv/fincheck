import { create } from './create'
import { cancelPurchase } from './cancelPurchase'
import { createPurchase } from './createPurchase'
import { getAll } from './getAll'
import { getStatementByMonth } from './getStatementByMonth'
import { importStatement } from './importStatement'
import { exportStatement } from './exportStatement'
import { payStatement } from './payStatement'
import { update } from './update'
import { updatePurchase } from './updatePurchase'

export const creditCardsService = {
  cancelPurchase,
  create,
  createPurchase,
  importStatement,
  exportStatement,
  getAll,
  getStatementByMonth,
  payStatement,
  updatePurchase,
  update,
}
