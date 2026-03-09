import { TransactionType } from '../entities/Transaction'

export function buildImportedTransactionName(description: string) {
  return description.trim().slice(0, 120)
}

export function resolveImportedCategoryId({
  type,
  transactionKind,
  suggestedCategoryId,
  cardBillCategoryId,
  description,
  categoriesById,
  fallbackCategories,
}: {
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  transactionKind: 'INCOME' | 'EXPENSE' | 'CARD_BILL_PAYMENT';
  suggestedCategoryId?: string;
  cardBillCategoryId?: string;
  description: string;
  categoriesById: Map<string, { id: string; name: string; type: string }>;
  fallbackCategories: { expenseCategoryId: string; incomeCategoryId: string };
}) {
  if (suggestedCategoryId) {
    const suggestedCategory = categoriesById.get(suggestedCategoryId)

    if (suggestedCategory && suggestedCategory.type === type) {
      return suggestedCategory.id
    }
  }

  if (transactionKind === 'CARD_BILL_PAYMENT' && cardBillCategoryId) {
    return cardBillCategoryId
  }

  const categoryByDescription = findCategoryByDescription(
    type,
    description,
    categoriesById,
  )

  if (categoryByDescription) {
    return categoryByDescription
  }

  return type === TransactionType.EXPENSE
    ? fallbackCategories.expenseCategoryId
    : fallbackCategories.incomeCategoryId
}

export function resolveImportedTransactionKind({
  description,
  userName,
  baseType,
  suggestedKind,
}: {
  description: string;
  userName?: string;
  baseType: TransactionType.INCOME | TransactionType.EXPENSE;
  suggestedKind?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CARD_BILL_PAYMENT';
}) {
  if (isCardBillPaymentDescription(description)) {
    return 'CARD_BILL_PAYMENT' as const
  }

  if (isLikelyOwnTransfer(description, userName)) {
    return 'TRANSFER' as const
  }

  if (
    suggestedKind === 'TRANSFER'
    || suggestedKind === 'CARD_BILL_PAYMENT'
    || suggestedKind === 'INCOME'
    || suggestedKind === 'EXPENSE'
  ) {
    return suggestedKind
  }

  return baseType === TransactionType.INCOME ? 'INCOME' : 'EXPENSE'
}

export function isInternalBalanceMovementDescription(description: string) {
  const normalized = normalizeText(description)

  return normalized.includes('resgate bb rende facil')
    || normalized.includes('aplicacao bb rende facil')
    || normalized.includes('bb rende facil')
    || normalized.includes('resgate rdb')
    || normalized.includes('aplicacao rdb')
    || normalized.includes('debito em conta')
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function isDuplicateNameEquivalent(leftName: string, rightName: string) {
  const leftNormalized = normalizeDuplicateName(leftName)
  const rightNormalized = normalizeDuplicateName(rightName)

  if (leftNormalized === rightNormalized) {
    return true
  }

  const leftTokens = getDuplicateSemanticTokens(leftName)
  const rightTokens = getDuplicateSemanticTokens(rightName)

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

  const rightSet = new Set(rightTokens)
  const intersection = leftTokens.filter((token) => rightSet.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  const similarity = union > 0 ? intersection / union : 0

  if (similarity >= 0.6) {
    return true
  }

  return intersection >= 1
}

export function toMoneyCents(value: number) {
  return Math.round(value * 100)
}

export function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

export function resolveOwnTransferCounterpartBankAccountId({
  description,
  currentBankAccountId,
  userBankAccounts,
}: {
  description: string;
  currentBankAccountId: string;
  userBankAccounts: Array<{ id: string; name: string }>;
}) {
  const normalizedDescription = normalizeText(description)

  if (!normalizedDescription.includes('conta propria')) {
    return undefined
  }

  const otherAccounts = userBankAccounts.filter((account) => account.id !== currentBankAccountId)

  if (!otherAccounts.length) {
    return undefined
  }

  const hintedText = extractParenthesesContent(description)
  const normalizedHint = hintedText ? normalizeText(hintedText) : ''

  if (normalizedHint) {
    const hintedAccount = otherAccounts.find((account) => {
      const normalizedAccountName = normalizeText(account.name)

      return normalizedHint.includes(normalizedAccountName)
        || normalizedAccountName.includes(normalizedHint)
    })

    if (hintedAccount) {
      return hintedAccount.id
    }
  }

  const keywordAliases: Array<{ aliases: string[] }> = [
    { aliases: ['nubank', 'nu bank', 'nu'] },
    { aliases: ['banco do brasil', 'bb'] },
    { aliases: ['sicoob', 'ccla canoinhas', 'cooperativa'] },
    { aliases: ['caixa', 'cef'] },
    { aliases: ['itau', 'itau'] },
    { aliases: ['bradesco'] },
    { aliases: ['santander'] },
    { aliases: ['inter', 'banco inter'] },
  ]

  for (const account of otherAccounts) {
    const normalizedAccountName = normalizeText(account.name)

    if (normalizedDescription.includes(normalizedAccountName)) {
      return account.id
    }

    const aliasGroup = keywordAliases.find((group) =>
      group.aliases.some((alias) => normalizedAccountName.includes(normalizeText(alias))),
    )

    if (
      aliasGroup
      && aliasGroup.aliases.some((alias) => normalizedDescription.includes(normalizeText(alias)))
    ) {
      return account.id
    }
  }

  if (otherAccounts.length === 1) {
    return otherAccounts[0].id
  }

  return undefined
}

export function findCardBillCategoryId(
  categories: Array<{ id: string; name: string; type: string }>,
) {
  const normalizedCandidates = categories
    .filter((category) => category.type === TransactionType.EXPENSE)
    .map((category) => ({
      id: category.id,
      normalizedName: normalizeText(category.name),
    }))

  const directMatch = normalizedCandidates.find((candidate) => (
    candidate.normalizedName.includes('fatura')
    || candidate.normalizedName.includes('cartao')
    || candidate.normalizedName.includes('credito')
  ))

  return directMatch?.id
}

function findCategoryByDescription(
  type: TransactionType.INCOME | TransactionType.EXPENSE,
  description: string,
  categoriesById: Map<string, { id: string; name: string; type: string }>,
) {
  const normalizedDescription = normalizeText(description)
  const expandedDescription = expandMerchantAliases(normalizedDescription)

  const compatibleCategories = Array.from(categoriesById.values())
    .filter((category) => category.type === type)

  let bestCategoryId: string | null = null
  let bestScore = 0

  for (const category of compatibleCategories) {
    const normalizedCategoryName = normalizeText(category.name)

    if (!normalizedCategoryName) {
      continue
    }

    const categoryTokens = normalizedCategoryName
      .split(' ')
      .filter((token) => token.length >= 3)

    let score = 0

    if (expandedDescription.includes(normalizedCategoryName)) {
      score += 10
    }

    categoryTokens.forEach((token) => {
      if (expandedDescription.includes(token)) {
        score += 3
      }
    })

    if (score > bestScore) {
      bestScore = score
      bestCategoryId = category.id
    }
  }

  return bestScore >= 6 ? bestCategoryId : null
}

function isCardBillPaymentDescription(description: string) {
  const normalized = normalizeText(description)

  return normalized.includes('pagamento de fatura')
    || normalized.includes('fatura do cartao')
    || normalized.includes('pix para cartao de credito')
    || normalized.includes('pagamento cartao de credito')
    || normalized.includes('pagto cartao credito')
    || normalized.includes('pagto cartao de credito')
    || normalized.includes('pagamento cartao credito')
}

function isLikelyOwnTransfer(description: string, userName?: string) {
  const normalizedDescription = normalizeText(description)

  const isOwnAccountPhrase = normalizedDescription.includes('conta propria')
    || normalizedDescription.includes('mesma titularidade')

  if (isOwnAccountPhrase && normalizedDescription.includes('pix')) {
    return true
  }

  if (!normalizedDescription.includes('transferencia') || !normalizedDescription.includes('pix')) {
    return false
  }

  if (!userName) {
    return false
  }

  const normalizedUserName = normalizeText(userName)

  if (!normalizedUserName) {
    return false
  }

  if (normalizedDescription.includes(normalizedUserName)) {
    return true
  }

  const userTokens = normalizedUserName
    .split(' ')
    .filter((token) => token.length >= 3)

  const matchedTokens = userTokens.filter((token) => normalizedDescription.includes(token))

  return matchedTokens.length >= 2
}

function normalizeDuplicateName(value: string) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDuplicateNameForTokens(value: string) {
  return normalizeDuplicateName(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDuplicateSemanticCategory(normalized: string) {
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

function extractDuplicateCounterpartyName(normalized: string) {
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

function normalizeDuplicateEntityName(value: string) {
  return normalizeDuplicateNameForTokens(value)
    .replace(/^pagamento\s+/g, '')
    .replace(/\b(ltda|ltd|eireli|me|s\.?a\.?|sa|companhia)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDuplicateSemanticTokens(value: string) {
  const normalized = normalizeDuplicateName(value)
  const category = getDuplicateSemanticCategory(normalized)

  if (category) {
    return [category]
  }

  const extracted = extractDuplicateCounterpartyName(normalized)
  const cleaned = normalizeDuplicateEntityName(extracted)
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

function expandMerchantAliases(normalizedDescription: string) {
  const aliases = [
    { pattern: /shpp brasil/g, canonical: 'shopee' },
    { pattern: /fisia comercio de produtos esportivos/g, canonical: 'nike' },
    { pattern: /\bfisia\b/g, canonical: 'nike' },
  ]

  let expanded = normalizedDescription

  aliases.forEach((alias) => {
    if (alias.pattern.test(expanded)) {
      expanded = `${expanded} ${alias.canonical}`
    }

    alias.pattern.lastIndex = 0
  })

  return expanded
}

function extractParenthesesContent(text: string) {
  const match = text.match(/\(([^)]+)\)/)

  return match?.[1]?.trim()
}
