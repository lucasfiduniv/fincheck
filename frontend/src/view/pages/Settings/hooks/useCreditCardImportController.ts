import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  ImportCreditCardStatementResponse,
} from '../../../../app/services/creditCardsService/importStatement'
import { creditCardsService } from '../../../../app/services/creditCardsService'
import { revalidateFinancialQueries } from '../../../../app/utils/revalidateFinancialQueries'
import { notifyFinancialImportCompleted } from '../../../../app/utils/financialImportRealtime'
import {
  connectFinancialImportSocket,
  FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT,
  FinancialImportProgressSocketEvent,
} from '../../../../app/utils/financialImportSocket'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

function formatSeconds(valueInMs?: number) {
  if (!valueInMs || valueInMs <= 0) {
    return '0s'
  }

  const totalSeconds = Math.max(0, Math.round(valueInMs / 1000))

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${seconds}s`
}

export function useCreditCardImportController(creditCards: Array<{ id: string; name: string }>) {
  const queryClient = useQueryClient()
  const requestIdRef = useRef<string | null>(null)
  const [creditCardStatementCardId, setCreditCardStatementCardId] = useState('')
  const [creditCardStatementFileName, setCreditCardStatementFileName] = useState('')
  const [creditCardStatementContent, setCreditCardStatementContent] = useState('')
  const [creditCardImportError, setCreditCardImportError] = useState('')
  const [creditCardPreview, setCreditCardPreview] = useState<string[]>([])
  const [creditCardImportResult, setCreditCardImportResult] = useState<ImportCreditCardStatementResponse | null>(null)
  const [creditCardImportProgress, setCreditCardImportProgress] = useState(0)
  const [creditCardImportStatus, setCreditCardImportStatus] = useState('')
  const [creditCardImportTimingLabel, setCreditCardImportTimingLabel] = useState('')

  useEffect(() => {
    if (!creditCards.length || creditCardStatementCardId) {
      return
    }

    setCreditCardStatementCardId(creditCards[0].id)
  }, [creditCards, creditCardStatementCardId])

  useEffect(() => {
    const socket = connectFinancialImportSocket()

    if (!socket) {
      return
    }

    function handleImportProgress(event: FinancialImportProgressSocketEvent) {
      if (event.source !== 'CREDIT_CARD_STATEMENT') {
        return
      }

      if (!requestIdRef.current || event.requestId !== requestIdRef.current) {
        return
      }

      setCreditCardImportProgress(event.progress)
      setCreditCardImportStatus(event.message || 'Processando fatura...')

      const etaLabel = event.etaMs && event.etaMs > 0
        ? ` • ETA ${formatSeconds(event.etaMs)}`
        : ''
      setCreditCardImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
    }

    socket.on(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)

    return () => {
      socket.off(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)
      socket.disconnect()
    }
  }, [])

  const { mutateAsync: importCreditCardStatement, isLoading: isImportingCreditCardStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof creditCardsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => creditCardsService.importStatement(params, { onUploadProgress }),
  )

  async function handleImportCreditCardStatement() {
    if (!creditCardStatementCardId || !creditCardStatementContent) {
      return
    }

    try {
      const requestId = crypto.randomUUID()
      requestIdRef.current = requestId

      setCreditCardImportProgress(0)
      setCreditCardImportStatus('Enviando fatura...')
      setCreditCardImportTimingLabel('')

      const response = await importCreditCardStatement({
        params: {
          creditCardId: creditCardStatementCardId,
          bank: 'NUBANK',
          csvContent: creditCardStatementContent,
          requestId,
        },
      })

      setCreditCardImportResult(response)

      await revalidateFinancialQueries(queryClient)

      if ((response.importedPaymentsCount ?? 0) > 0) {
        notifyFinancialImportCompleted({
          source: 'CREDIT_CARD_STATEMENT',
          importedCount: response.importedPaymentsCount ?? 0,
        })
      }

      setCreditCardImportProgress(100)
      setCreditCardImportStatus('Importacao concluida.')
      setCreditCardImportTimingLabel('')

      toast.success(`Fatura importada! ${response.importedCount} compra(s) e ${response.importedPaymentsCount ?? 0} pagamento(s).`)
    } catch {
      setCreditCardImportStatus('Falha na importacao.')
      setCreditCardImportTimingLabel('')
      toast.error('Nao foi possivel importar a fatura do cartao. Confira o arquivo e tente novamente.')
    } finally {
      setTimeout(() => {
        setCreditCardImportProgress(0)
        setCreditCardImportStatus('')
        setCreditCardImportTimingLabel('')
        requestIdRef.current = null
      }, 1200)
    }
  }

  async function handleCreditCardStatementFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setCreditCardStatementFileName('')
      setCreditCardStatementContent('')
      setCreditCardPreview([])
      setCreditCardImportError('')
      return
    }

    const lowerCaseName = file.name.toLowerCase()
    const isCsvOrOfx = lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.ofx')

    if (!isCsvOrOfx) {
      setCreditCardImportError('Selecione um arquivo CSV ou OFX valido.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setCreditCardImportError('Arquivo maior que 5MB. Use um arquivo menor.')
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()

      setCreditCardStatementFileName(file.name)
      setCreditCardStatementContent(content)
      setCreditCardImportError('')
      setCreditCardImportResult(null)

      const previewLines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5)

      setCreditCardPreview(previewLines.length > 0 ? previewLines : ['Arquivo sem linhas para preview.'])
    } catch {
      setCreditCardImportError('Falha ao ler o arquivo. Tente novamente.')
    }
  }

  return {
    creditCardStatementCardId,
    setCreditCardStatementCardId,
    creditCardStatementFileName,
    creditCardStatementContent,
    creditCardImportError,
    creditCardPreview,
    creditCardImportResult,
    creditCardImportProgress,
    creditCardImportStatus,
    creditCardImportTimingLabel,
    isImportingCreditCardStatement,
    handleCreditCardStatementFileChange,
    handleImportCreditCardStatement,
  }
}
