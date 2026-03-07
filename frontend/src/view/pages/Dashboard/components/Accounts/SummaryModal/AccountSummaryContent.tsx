import { BankAccount } from '../../../../../../app/entities/BankAccount'
import { Transaction } from '../../../../../../app/entities/Transaction'
import { formatCurrency } from '../../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../../app/utils/formatDate'
import { Button } from '../../../../../components/Button'
import { UploadIcon } from '@radix-ui/react-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { transactionsService } from '../../../../../../app/services/transactionsService'
import { revalidateFinancialQueries } from '../../../../../../app/utils/revalidateFinancialQueries'
import { notifyFinancialImportCompleted } from '../../../../../../app/utils/financialImportRealtime'
import {
  connectFinancialImportSocket,
  FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT,
  FinancialImportProgressSocketEvent,
} from '../../../../../../app/utils/financialImportSocket'

interface AccountSummaryContentProps {
  account: BankAccount
  accountIncomeMonth: number
  accountExpenseMonth: number
  lastTransactions: Transaction[]
  onEditAccount?(): void
  onDeleteAccount?(): void
  onCreateTransaction?(): void
  isDeletingAccount: boolean
}

const ACCOUNT_TYPE_LABEL: Record<BankAccount['type'], string> = {
  CHECKING: 'Conta corrente',
  CASH: 'Dinheiro',
  INVESTMENT: 'Investimento',
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

export function AccountSummaryContent({
  account,
  accountIncomeMonth,
  accountExpenseMonth,
  lastTransactions,
  onEditAccount,
  onDeleteAccount,
  onCreateTransaction,
  isDeletingAccount,
}: AccountSummaryContentProps) {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const importRequestIdRef = useRef<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [importTimingLabel, setImportTimingLabel] = useState('')

  useEffect(() => {
    const socket = connectFinancialImportSocket()

    if (!socket) {
      return
    }

    function handleImportProgress(event: FinancialImportProgressSocketEvent) {
      if (event.source !== 'BANK_STATEMENT') {
        return
      }

      if (event.bankAccountId !== account.id) {
        return
      }

      if (!importRequestIdRef.current || event.requestId !== importRequestIdRef.current) {
        return
      }

      setImportProgress(event.progress)
      setImportStatus(event.message || 'Processando importação...')

      const etaLabel = event.etaMs && event.etaMs > 0
        ? ` • ETA ${formatSeconds(event.etaMs)}`
        : ''
      setImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
    }

    socket.on(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)

    return () => {
      socket.off(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)
      socket.disconnect()
    }
  }, [account.id])

  const { mutateAsync: importStatementMutation, isLoading: isImportingStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof transactionsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => transactionsService.importStatement(params, { onUploadProgress }),
  )

  function resolveStatementProvider(content: string) {
    const normalized = content.replace(/^\uFEFF/, '').trim().toUpperCase()

    if (normalized.startsWith('DATA:APPLICATION/PDF;BASE64,')) {
      return 'SICOOB' as const
    }

    if (
      normalized.includes('<OFX>')
      && (normalized.includes('BANCO DO BRASIL') || normalized.includes('<BANKID>1</BANKID>'))
    ) {
      return 'BANCO_DO_BRASIL' as const
    }

    return 'NUBANK' as const
  }

  async function handleImportStatementFile(file?: File) {
    if (!file) {
      return
    }

    const lowerCaseName = file.name.toLowerCase()
    const isPdf = lowerCaseName.endsWith('.pdf')
    const isCsvOrOfx = lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.ofx')
    const isSupportedStatementFile = isCsvOrOfx || isPdf

    if (!isSupportedStatementFile) {
      toast.error('Selecione um arquivo CSV, OFX ou PDF válido.')
      return
    }

    try {
      const requestId = crypto.randomUUID()
      importRequestIdRef.current = requestId

      setImportProgress(0)
      setImportStatus(`Lendo ${file.name}...`)
      setImportTimingLabel('')

      const content = isPdf
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
      const provider = isPdf ? 'SICOOB' as const : resolveStatementProvider(content)

      setImportProgress(0)
      setImportStatus('Enviando extrato...')

      const response = await importStatementMutation({
        params: {
          bank: provider,
          bankAccountId: account.id,
          csvContent: content,
          requestId,
        },
      })

      await revalidateFinancialQueries(queryClient)

      if (response.importedCount > 0) {
        notifyFinancialImportCompleted({
          source: 'BANK_STATEMENT',
          importedCount: response.importedCount,
        })
      }

      setImportProgress(100)
      setImportStatus('Importação concluída.')
      setImportTimingLabel('')

      toast.success(`Extrato importado nesta conta: ${response.importedCount} lançamento(s) criado(s).`)
    } catch {
      setImportStatus('Falha na importação.')
      setImportTimingLabel('')
      toast.error('Não foi possível importar o extrato desta conta.')
    } finally {
      setTimeout(() => {
        setImportProgress(0)
        setImportStatus('')
        setImportTimingLabel('')
        importRequestIdRef.current = null
      }, 1200)
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.ofx,.pdf,text/csv,application/vnd.ms-excel,application/pdf"
        className="hidden"
        onChange={(event) => {
          void handleImportStatementFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      <div className="rounded-xl bg-gray-50 p-4 space-y-2">
        <strong className="text-gray-800 block text-lg tracking-[-0.5px]">{account.name}</strong>
        <span className="text-xs text-gray-600 block">{ACCOUNT_TYPE_LABEL[account.type]}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Saldo atual</span>
          <strong className="text-gray-800">{formatCurrency(account.currentBalance)}</strong>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Saldo inicial</span>
          <strong className="text-gray-800">{formatCurrency(account.initialBalance)}</strong>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Entradas no mês</span>
          <strong className="text-green-800">{formatCurrency(accountIncomeMonth)}</strong>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Saídas no mês</span>
          <strong className="text-red-800">{formatCurrency(accountExpenseMonth)}</strong>
        </div>
      </div>

      <div className="space-y-2">
        <strong className="text-sm tracking-[-0.5px] text-gray-800 block">Últimas 5 transações</strong>

        {lastTransactions.length === 0 && (
          <span className="text-xs text-gray-600">Sem transações neste mês.</span>
        )}

        {lastTransactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between text-xs">
            <div className="flex flex-col pr-2">
              <span className="text-gray-800 truncate">{transaction.name}</span>
              <span className="text-gray-600">{formatDate(new Date(transaction.date))}</span>
            </div>

            <strong
              className={
                transaction.type === 'INCOME'
                  ? 'text-green-800'
                  : transaction.type === 'EXPENSE'
                    ? 'text-red-800'
                    : 'text-gray-700'
              }
            >
              {transaction.type === 'INCOME'
                ? '+'
                : transaction.type === 'EXPENSE'
                  ? '-'
                  : transaction.value < 0
                    ? '-'
                    : '+'}{' '}
              {formatCurrency(Math.abs(transaction.value))}
            </strong>
          </div>
        ))}
      </div>

      <div className="pt-2 grid grid-cols-1 gap-2">
        <Button type="button" onClick={onEditAccount}>Editar conta</Button>
        <Button type="button" onClick={onCreateTransaction}>Nova transação</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => importInputRef.current?.click()}
          isLoading={isImportingStatement}
        >
          <UploadIcon className="w-4 h-4 mr-1" />
          Importar extrato
        </Button>
        <Button type="button" variant="danger" onClick={onDeleteAccount} isLoading={isDeletingAccount}>
          Excluir conta
        </Button>
      </div>

      {(isImportingStatement || importStatus) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-700">
            <span>{importStatus || 'Importando extrato...'}</span>
            <strong>{importProgress}%</strong>
          </div>
          {!!importTimingLabel && (
            <div className="text-[11px] text-gray-500">{importTimingLabel}</div>
          )}
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-800 transition-all"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}