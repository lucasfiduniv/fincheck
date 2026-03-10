import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  ImportStatementResponse,
  SupportedStatementBank,
} from '../../../../app/services/transactionsService/importStatement'
import { transactionsService } from '../../../../app/services/transactionsService'
import { revalidateFinancialQueries } from '../../../../app/utils/revalidateFinancialQueries'
import { notifyFinancialImportCompleted } from '../../../../app/utils/financialImportRealtime'
import {
  connectFinancialImportSocket,
  FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT,
  FinancialImportProgressSocketEvent,
} from '../../../../app/utils/financialImportSocket'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const BANK_FORMAT_RULES: Record<SupportedStatementBank, Array<'csv' | 'ofx' | 'pdf'>> = {
  NUBANK: ['csv', 'ofx'],
  BANCO_DO_BRASIL: ['ofx'],
  SICOOB: ['pdf'],
}

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

function resolveExtension(fileName: string) {
  const lowerCaseName = fileName.toLowerCase()

  if (lowerCaseName.endsWith('.csv')) {
    return 'csv'
  }

  if (lowerCaseName.endsWith('.ofx')) {
    return 'ofx'
  }

  if (lowerCaseName.endsWith('.pdf')) {
    return 'pdf'
  }

  return null
}

export function useStatementImportController(accounts: Array<{ id: string; name: string }>) {
  const queryClient = useQueryClient()
  const requestIdRef = useRef<string | null>(null)
  const [statementBank, setStatementBank] = useState<SupportedStatementBank>('NUBANK')
  const [statementBankAccountId, setStatementBankAccountId] = useState('')
  const [statementFileName, setStatementFileName] = useState('')
  const [statementCsvContent, setStatementCsvContent] = useState('')
  const [statementImportError, setStatementImportError] = useState('')
  const [statementFilePreview, setStatementFilePreview] = useState<string[]>([])
  const [importResult, setImportResult] = useState<ImportStatementResponse | null>(null)
  const [statementImportProgress, setStatementImportProgress] = useState(0)
  const [statementImportStatus, setStatementImportStatus] = useState('')
  const [statementImportTimingLabel, setStatementImportTimingLabel] = useState('')

  useEffect(() => {
    if (!accounts.length || statementBankAccountId) {
      return
    }

    setStatementBankAccountId(accounts[0].id)
  }, [accounts, statementBankAccountId])

  useEffect(() => {
    const socket = connectFinancialImportSocket()

    if (!socket) {
      return
    }

    function handleImportProgress(event: FinancialImportProgressSocketEvent) {
      if (event.source !== 'BANK_STATEMENT') {
        return
      }

      if (!requestIdRef.current || event.requestId !== requestIdRef.current) {
        return
      }

      setStatementImportProgress(event.progress)
      setStatementImportStatus(event.message || 'Processando extrato...')

      const etaLabel = event.etaMs && event.etaMs > 0
        ? ` • ETA ${formatSeconds(event.etaMs)}`
        : ''
      setStatementImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
    }

    socket.on(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)

    return () => {
      socket.off(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)
      socket.disconnect()
    }
  }, [])

  const { mutateAsync: importStatement, isLoading: isImportingStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof transactionsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => transactionsService.importStatement(params, { onUploadProgress }),
  )

  const acceptedFormatsLabel = useMemo(() => {
    const allowed = BANK_FORMAT_RULES[statementBank]

    if (allowed.length === 1) {
      return allowed[0].toUpperCase()
    }

    return allowed.map((format) => format.toUpperCase()).join(' ou ')
  }, [statementBank])

  async function handleImportStatement() {
    if (!statementBankAccountId || !statementCsvContent) {
      return
    }

    try {
      const requestId = crypto.randomUUID()
      requestIdRef.current = requestId

      setStatementImportProgress(0)
      setStatementImportStatus('Enviando extrato...')
      setStatementImportTimingLabel('')

      const response = await importStatement({
        params: {
          bank: statementBank,
          bankAccountId: statementBankAccountId,
          csvContent: statementCsvContent,
          requestId,
        },
      })

      setImportResult(response)

      await revalidateFinancialQueries(queryClient)

      if (response.importedCount > 0) {
        notifyFinancialImportCompleted({
          source: 'BANK_STATEMENT',
          importedCount: response.importedCount,
        })
      }

      setStatementImportProgress(100)
      setStatementImportStatus('Importacao concluida.')
      setStatementImportTimingLabel('')

      toast.success(`Extrato importado! ${response.importedCount} lancamento(s) criado(s).`)
    } catch {
      setStatementImportStatus('Falha na importacao.')
      setStatementImportTimingLabel('')
      toast.error('Nao foi possivel importar o extrato. Confira o arquivo e tente novamente.')
    } finally {
      setTimeout(() => {
        setStatementImportProgress(0)
        setStatementImportStatus('')
        setStatementImportTimingLabel('')
        requestIdRef.current = null
      }, 1200)
    }
  }

  async function handleStatementFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setStatementFileName('')
      setStatementCsvContent('')
      setStatementFilePreview([])
      setStatementImportError('')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatementImportError('Arquivo maior que 5MB. Use um arquivo menor.')
      setStatementFileName('')
      setStatementCsvContent('')
      setStatementFilePreview([])
      event.target.value = ''
      return
    }

    const extension = resolveExtension(file.name)

    if (!extension) {
      setStatementImportError('Selecione um arquivo CSV, OFX ou PDF valido.')
      event.target.value = ''
      return
    }

    const allowedByBank = BANK_FORMAT_RULES[statementBank]

    if (!allowedByBank.includes(extension)) {
      setStatementImportError(`Formato .${extension} nao compativel com ${statementBank}. Use ${acceptedFormatsLabel}.`)
      setStatementFileName('')
      setStatementCsvContent('')
      setStatementFilePreview([])
      event.target.value = ''
      return
    }

    try {
      const content = extension === 'pdf'
        ? await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()

          reader.onload = () => {
            const result = reader.result

            if (typeof result !== 'string') {
              reject(new Error('Falha ao ler PDF'))
              return
            }

            resolve(result)
          }

          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        : await file.text()

      setStatementFileName(file.name)
      setStatementCsvContent(content)
      setStatementImportError('')
      setImportResult(null)

      if (extension === 'pdf') {
        setStatementFilePreview(['Preview nao disponivel para PDF.'])
      } else {
        const previewLines = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 5)

        setStatementFilePreview(previewLines.length > 0 ? previewLines : ['Arquivo sem linhas para preview.'])
      }
    } catch {
      setStatementImportError('Falha ao ler o arquivo. Tente novamente.')
    }
  }

  return {
    statementBank,
    setStatementBank,
    statementBankAccountId,
    setStatementBankAccountId,
    statementFileName,
    statementCsvContent,
    statementImportError,
    statementFilePreview,
    acceptedFormatsLabel,
    importResult,
    statementImportStatus,
    statementImportProgress,
    statementImportTimingLabel,
    isImportingStatement,
    handleStatementFileChange,
    handleImportStatement,
  }
}
