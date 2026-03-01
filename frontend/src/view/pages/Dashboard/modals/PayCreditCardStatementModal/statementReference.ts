interface MonthYearReference {
  month: number
  year: number
}

interface ResolveOpenStatementReferenceParams<TStatement extends { month: number; year: number; pending: number; status: string }> {
  creditCardId: string
  offsets?: number[]
  getStatementByMonth(params: { creditCardId: string; month: number; year: number }): Promise<TStatement>
}

function addMonths(month: number, year: number, offset: number) {
  const date = new Date(Date.UTC(year, month + offset, 1))

  return {
    month: date.getUTCMonth(),
    year: date.getUTCFullYear(),
  }
}

function getCurrentReference(): MonthYearReference {
  const now = new Date()

  return {
    month: now.getUTCMonth(),
    year: now.getUTCFullYear(),
  }
}

export async function resolveOpenStatementReference<TStatement extends { month: number; year: number; pending: number; status: string }>({
  creditCardId,
  getStatementByMonth,
  offsets = [0, -1, 1, -2, 2, -3, 3],
}: ResolveOpenStatementReferenceParams<TStatement>) {
  const currentReference = getCurrentReference()

  const statements = await Promise.all(
    offsets.map(async (offset) => {
      const reference = addMonths(currentReference.month, currentReference.year, offset)

      try {
        return await getStatementByMonth({
          creditCardId,
          month: reference.month,
          year: reference.year,
        })
      } catch {
        return null
      }
    }),
  )

  const openStatement = statements.find(
    (statement) =>
      !!statement &&
      statement.pending > 0 &&
      statement.status !== 'PAID',
  )

  if (openStatement) {
    return {
      month: openStatement.month,
      year: openStatement.year,
    }
  }

  return currentReference
}