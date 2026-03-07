import { PrismaClient, TransactionStatus, TransactionEntryType } from '@prisma/client'

function parseArg(name: string) {
  const prefixed = `--${name}=`
  const arg = process.argv.find((entry) => entry.startsWith(prefixed))

  if (!arg) {
    return undefined
  }

  return arg.slice(prefixed.length)
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForTokens(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCounterpartyName(normalized: string) {
  const patterns = [
    /^pix para\s+(.+)$/,
    /^pix de\s+(.+)$/,
    /^pix recebido de\s+(.+)$/,
    /^transferencia recebida de\s+(.+)$/,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)

    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return normalized
}

function semanticCategory(normalized: string) {
  if (normalized.includes('conta propria') || normalized.includes('contas proprias')) {
    return '__conta_propria__'
  }

  if (
    normalized.includes('pagamento de fatura de cartao')
    || normalized.includes('pagamento de fatura')
  ) {
    return '__fatura__'
  }

  if (
    normalized.includes('pix no credito')
    || normalized.includes('valor adicionado via pix no credito')
  ) {
    return '__pix_credito__'
  }

  if (
    normalized.includes('aplicacao em investimento')
    || normalized === 'investimento'
    || normalized.includes('aplicacao em rdb')
    || normalized.includes('aplicacao bb rende facil')
  ) {
    return '__investimento_aplicacao__'
  }

  if (
    normalized.includes('resgate de rdb')
    || normalized.includes('resgate bb rende facil')
    || normalized.includes('devolucao de aplicacao em investimento')
  ) {
    return '__investimento_resgate__'
  }

  return null
}

function normalizeEntityName(value: string) {
  return normalizeForTokens(value)
    .replace(/^pagamento\s+/g, '')
    .replace(/\b(ltda|ltd|eireli|me|s\.?a\.?|sa|companhia)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSemanticNameTokens(value: string) {
  const normalized = normalizeName(value)
  const category = semanticCategory(normalized)

  if (category) {
    return [category]
  }

  const extracted = extractCounterpartyName(normalized)
  const cleaned = normalizeEntityName(extracted)
  const stopwords = new Set([
    'pix',
    'para',
    'de',
    'recebido',
    'recebida',
    'transferencia',
    'entre',
    'conta',
    'contas',
    'propria',
    'proprias',
    'banco',
    'brasil',
    'nubank',
    'valor',
    'adicionado',
    'via',
    'no',
    'credito',
    'fatura',
    'cartao',
    'aplicacao',
    'resgate',
    'rdb',
    'rende',
    'facil',
    'em',
    'investimento',
  ])

  const tokens = cleaned
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token))

  return Array.from(new Set(tokens))
}

function hasTokenInCommon(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.some((token) => rightSet.has(token))
}

function isNameSemanticallyEquivalent(leftName: string, rightName: string) {
  const leftNormalized = normalizeName(leftName)
  const rightNormalized = normalizeName(rightName)

  if (leftNormalized === rightNormalized) {
    return true
  }

  const leftTokens = getSemanticNameTokens(leftName)
  const rightTokens = getSemanticNameTokens(rightName)

  if (!leftTokens.length || !rightTokens.length) {
    return false
  }

  if (leftTokens.length === 1 && rightTokens.length === 1) {
    return leftTokens[0] === rightTokens[0]
  }

  if (leftTokens.length === 1) {
    return rightTokens.includes(leftTokens[0])
  }

  if (rightTokens.length === 1) {
    return leftTokens.includes(rightTokens[0])
  }

  const leftSet = new Set(leftTokens)
  const rightSet = new Set(rightTokens)
  const intersection = leftTokens.filter((token) => rightSet.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  const similarity = union > 0 ? intersection / union : 0

  if (similarity >= 0.6) {
    return true
  }

  if (intersection >= 2) {
    return true
  }

  return hasTokenInCommon(leftTokens, rightTokens)
}

function toMoneyCents(value: number) {
  return Math.round(value * 100)
}

async function main() {
  const prisma = new PrismaClient()

  const fromArg = parseArg('from')
  const toArg = parseArg('to')
  const userId = parseArg('userId')
  const bankAccountId = parseArg('bankAccountId')
  const apply = hasFlag('apply')
  const semanticName = hasFlag('semanticName')
  const includeAllStatuses = hasFlag('allStatuses')
  const includeAllEntryTypes = hasFlag('allEntryTypes')
  const reportSameBucket = hasFlag('reportSameBucket')

  const from = fromArg ? new Date(fromArg) : undefined
  const to = toArg ? new Date(toArg) : undefined

  if (fromArg && Number.isNaN(from?.getTime())) {
    throw new Error(`Invalid --from date: ${fromArg}`)
  }

  if (toArg && Number.isNaN(to?.getTime())) {
    throw new Error(`Invalid --to date: ${toArg}`)
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(!includeAllStatuses ? { status: TransactionStatus.POSTED } : {}),
      ...(!includeAllEntryTypes ? { entryType: TransactionEntryType.SINGLE } : {}),
      ...(userId ? { userId } : {}),
      ...(bankAccountId ? { bankAccountId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lt: to } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      bankAccountId: true,
      type: true,
      value: true,
      name: true,
      date: true,
    },
    orderBy: [
      { date: 'asc' },
      { id: 'asc' },
    ],
  })

  const grouped = new Map<string, { id: string; name: string }[]>()

  for (const transaction of transactions) {
    const dateKey = transaction.date.toISOString().slice(0, 10)
    const key = [
      transaction.userId,
      transaction.bankAccountId,
      transaction.type,
      dateKey,
      String(toMoneyCents(Number(transaction.value))),
    ].join('|')

    const items = grouped.get(key) ?? []
    items.push({ id: transaction.id, name: transaction.name })
    grouped.set(key, items)
  }

  const duplicateIds: string[] = []

  for (const [bucketKey, group] of grouped.entries()) {
    if (group.length <= 1) {
      continue
    }

    if (reportSameBucket) {
      const names = Array.from(new Set(group.map((item) => item.name)))
      console.log(`[bucket ${bucketKey}] count=${group.length} names=${names.join(' | ')}`)
    }

    const keepers: { id: string; name: string }[] = []

    for (const item of group) {
      if (!keepers.length) {
        keepers.push(item)
        continue
      }

      const hasEquivalent = keepers.some((keeper) => {
        if (!semanticName) {
          return normalizeName(keeper.name) === normalizeName(item.name)
        }

        return isNameSemanticallyEquivalent(keeper.name, item.name)
      })

      if (hasEquivalent) {
        duplicateIds.push(item.id)
        continue
      }

      keepers.push(item)
    }
  }

  if (!duplicateIds.length) {
    console.log(
      `No duplicates found for the provided scope${includeAllStatuses ? ' (all statuses)' : ''}${includeAllEntryTypes ? ' (all entry types)' : ''}.`,
    )
    await prisma.$disconnect()
    return
  }

  console.log(`Duplicate candidates found: ${duplicateIds.length}`)

  if (!apply) {
    console.log(
      `Dry run mode${semanticName ? ' (semantic name matching enabled)' : ''}. Add --apply to remove duplicates.`,
    )
    await prisma.$disconnect()
    return
  }

  const deleted = await prisma.transaction.deleteMany({
    where: {
      id: {
        in: duplicateIds,
      },
    },
  })

  console.log(`Deleted duplicates: ${deleted.count}`)

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
