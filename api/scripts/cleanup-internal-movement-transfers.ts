import { PrismaClient, TransactionType } from '@prisma/client'

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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isInternalBalanceMovementDescription(description: string) {
  const normalized = normalizeText(description)

  return normalized.includes('resgate bb rende facil')
    || normalized.includes('aplicacao bb rende facil')
    || normalized.includes('bb rende facil')
    || normalized.includes('resgate rdb')
    || normalized.includes('aplicacao rdb')
    || normalized.includes('debito em conta')
}

async function main() {
  const prisma = new PrismaClient()

  const fromArg = parseArg('from')
  const toArg = parseArg('to')
  const userId = parseArg('userId')
  const bankAccountId = parseArg('bankAccountId')
  const apply = hasFlag('apply')

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
      type: TransactionType.TRANSFER,
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
      name: true,
      date: true,
      value: true,
      userId: true,
      bankAccountId: true,
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })

  const targetTransactions = transactions.filter((transaction) => {
    return isInternalBalanceMovementDescription(transaction.name)
  })

  if (!targetTransactions.length) {
    console.log('No internal movement transfers found for the provided scope.')
    await prisma.$disconnect()
    return
  }

  console.log(`Internal movement transfers found: ${targetTransactions.length}`)
  targetTransactions.slice(0, 20).forEach((transaction) => {
    console.log(
      `${transaction.id} | ${transaction.date.toISOString().slice(0, 10)} | ${transaction.value} | ${transaction.name}`,
    )
  })

  if (!apply) {
    console.log('Dry run mode. Add --apply to remove these transfers.')
    await prisma.$disconnect()
    return
  }

  const deleted = await prisma.transaction.deleteMany({
    where: {
      id: {
        in: targetTransactions.map((transaction) => transaction.id),
      },
    },
  })

  console.log(`Deleted internal movement transfers: ${deleted.count}`)

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})
