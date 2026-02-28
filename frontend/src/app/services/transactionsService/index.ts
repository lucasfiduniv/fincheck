import { create } from './create'
import { getAll } from './getAll'
import { getDueAlertsSummary } from './getDueAlertsSummary'
import { remove } from './remove'
import { update } from './update'

export const transactionsService = {
  create,
  getAll,
  getDueAlertsSummary,
  update,
  remove
}
