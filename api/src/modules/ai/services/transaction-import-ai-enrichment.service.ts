import { Injectable } from '@nestjs/common'
import { GeminiClientService } from './gemini-client.service'

interface ImportEntryInput {
  index: number
  description: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
}

type ImportTransactionKind = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CARD_BILL_PAYMENT'

interface CategoryInput {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

interface EntrySuggestion {
  index: number
  normalizedDescription: string
  categoryId?: string
  transactionKind?: ImportTransactionKind
  confidence?: number
}

interface EnrichmentOutput {
  suggestions: EntrySuggestion[]
}

@Injectable()
export class TransactionImportAiEnrichmentService {
  constructor(private readonly geminiClientService: GeminiClientService) {}

  async enrichEntries({
    entries,
    categories,
    userName,
    bankAccountName,
    userBankAccounts,
  }: {
    entries: ImportEntryInput[]
    categories: CategoryInput[]
    userName?: string
    bankAccountName?: string
    userBankAccounts?: Array<{ id: string; name: string }>
  }) {
    if (!entries.length || !categories.length) {
      return new Map<number, EntrySuggestion>()
    }

    const categoriesPayload = categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
    }))

    const entriesPayload = entries.map((entry) => ({
      index: entry.index,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
    }))

    const systemInstruction = [
      'Você é especialista em classificação de transações bancárias em português brasileiro.',
      'Responda somente com JSON válido.',
      'Não invente categoryId, use apenas os categoryIds fornecidos.',
      'Se transactionKind for INCOME ou EXPENSE, a categoria deve ter o mesmo type.',
      'Se transactionKind for TRANSFER, não inclua categoryId.',
      'Use transactionKind=CARD_BILL_PAYMENT para pagamentos de fatura de cartão (ex.: pagamento de fatura, pix para cartão de crédito).',
      'Use transactionKind=TRANSFER para Pix/transferências entre contas próprias.',
      'A descrição normalizada deve ser curta, clara e útil para o usuário.',
    ].join(' ')

    const prompt = [
      'Contexto do sistema:',
      `- Nome do usuário: ${userName || 'não informado'}`,
      `- Conta de destino da importação: ${bankAccountName || 'não informada'}`,
      `- Outras contas do usuário: ${JSON.stringify(userBankAccounts ?? [])}`,
      '- Regras: INCOME/EXPENSE precisam de categoria compatível; TRANSFER não tem categoria; CARD_BILL_PAYMENT é despesa e deve priorizar categoria de fatura/cartão se existir.',
      'Retorne um JSON no formato {"suggestions":[{"index":number,"normalizedDescription":string,"transactionKind":"INCOME|EXPENSE|TRANSFER|CARD_BILL_PAYMENT","categoryId":string,"confidence":number}]}.',
      'Se não tiver confiança para categoria, omita categoryId.',
      'Categorias disponíveis:',
      JSON.stringify(categoriesPayload),
      'Transações para enriquecer:',
      JSON.stringify(entriesPayload),
    ].join('\n')

    const response = await this.geminiClientService.generateJson<EnrichmentOutput>({
      systemInstruction,
      prompt,
      temperature: 0.1,
    })

    if (!response?.suggestions?.length) {
      return new Map<number, EntrySuggestion>()
    }

    const validCategoryIds = new Set(categories.map((category) => category.id))
    const categoriesById = new Map(categories.map((category) => [category.id, category]))

    const suggestionsMap = new Map<number, EntrySuggestion>()

    response.suggestions.forEach((suggestion) => {
      if (typeof suggestion.index !== 'number') {
        return
      }

      const entry = entries.find((importEntry) => importEntry.index === suggestion.index)

      if (!entry) {
        return
      }

      const normalizedDescription =
        (suggestion.normalizedDescription || '').trim() || this.normalizeDescriptionFallback(entry.description)

      const normalizedSuggestion: EntrySuggestion = {
        index: suggestion.index,
        normalizedDescription,
      }

      if (
        suggestion.categoryId
        && validCategoryIds.has(suggestion.categoryId)
      ) {
        const candidateCategory = categoriesById.get(suggestion.categoryId)

        if (candidateCategory?.type === entry.type) {
          normalizedSuggestion.categoryId = suggestion.categoryId
        }
      }

      if (
        suggestion.transactionKind === 'INCOME'
        || suggestion.transactionKind === 'EXPENSE'
        || suggestion.transactionKind === 'TRANSFER'
        || suggestion.transactionKind === 'CARD_BILL_PAYMENT'
      ) {
        normalizedSuggestion.transactionKind = suggestion.transactionKind
      }

      if (typeof suggestion.confidence === 'number') {
        normalizedSuggestion.confidence = suggestion.confidence
      }

      suggestionsMap.set(suggestion.index, normalizedSuggestion)
    })

    return suggestionsMap
  }

  normalizeDescriptionFallback(description: string) {
    const raw = description.replace(/\s+/g, ' ').trim()

    if (!raw) {
      return 'Transação importada'
    }

    if (/^transfer[eê]ncia enviada pelo pix/i.test(raw)) {
      return raw.replace(/^transfer[eê]ncia enviada pelo pix\s*-\s*/i, 'Pix enviado - ')
    }

    if (/^transfer[eê]ncia recebida pelo pix/i.test(raw)) {
      return raw.replace(/^transfer[eê]ncia recebida pelo pix\s*-\s*/i, 'Pix recebido - ')
    }

    if (/^compra no d[eé]bito\s*-\s*/i.test(raw)) {
      return raw.replace(/^compra no d[eé]bito\s*-\s*/i, 'Compra débito - ')
    }

    return raw.slice(0, 120)
  }
}
