import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { notificationsService } from '../../../app/services/notificationsService'
import { toast } from 'react-hot-toast'
import { NotificationPreferences } from '../../../app/entities/NotificationSettings'
import { SettingsHero } from './components/SettingsHero'
import { SettingsMenu, SettingsMenuItem } from './components/SettingsMenu'
import { NotificationsSettingsPanel } from './components/NotificationsSettingsPanel'
import { ImportsSettingsPanel } from './components/ImportsSettingsPanel'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCreditCards } from '../../../app/hooks/useCreditCards'
import {
  ImportStatementResponse,
  SupportedStatementBank,
} from '../../../app/services/transactionsService/importStatement'
import { transactionsService } from '../../../app/services/transactionsService'
import {
  ImportCreditCardStatementResponse,
} from '../../../app/services/creditCardsService/importStatement'
import { creditCardsService } from '../../../app/services/creditCardsService'
import { revalidateFinancialQueries } from '../../../app/utils/revalidateFinancialQueries'
import { notifyFinancialImportCompleted } from '../../../app/utils/financialImportRealtime'
import {
  connectFinancialImportSocket,
  FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT,
  FinancialImportProgressSocketEvent,
} from '../../../app/utils/financialImportSocket'

function toLocalDigits(value: string) {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('55')) {
    return digits.slice(2, 13)
  }

  return digits.slice(0, 11)
}

function toStoragePhone(value: string) {
  const localDigits = toLocalDigits(value)

  if (!localDigits) {
    return ''
  }

  return `55${localDigits}`
}

function formatPhoneMask(value: string) {
  const localDigits = toLocalDigits(value)

  if (!localDigits) {
    return ''
  }

  if (localDigits.length <= 2) {
    return `+55 (${localDigits}`
  }

  if (localDigits.length <= 6) {
    return `+55 (${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`
  }

  const frontLength = localDigits.length === 11 ? 7 : 6
  const front = localDigits.slice(2, frontLength)
  const back = localDigits.slice(frontLength)

  return `+55 (${localDigits.slice(0, 2)}) ${front}${back ? `-${back}` : ''}`
}

const EMPTY_PREFERENCES: NotificationPreferences = {
  dueReminders: true,
  creditCardDue: true,
  budgetAlerts: true,
  lowBalance: false,
  weeklySummary: false,
}

const preferenceOptions: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: 'dueReminders',
    title: 'Vencimentos próximos',
    description: 'Avisa quando recorrências e parcelas estiverem perto do vencimento.',
  },
  {
    key: 'creditCardDue',
    title: 'Fatura do cartão',
    description: 'Receba lembrete antes da data de pagamento da fatura.',
  },
  {
    key: 'budgetAlerts',
    title: 'Alertas de orçamento',
    description: 'Notifica quando categorias chegam perto ou passam do limite.',
  },
  {
    key: 'lowBalance',
    title: 'Saldo baixo',
    description: 'Dispara aviso quando alguma conta ficar com saldo baixo.',
  },
  {
    key: 'weeklySummary',
    title: 'Resumo semanal',
    description: 'Envia um resumo da semana com entradas e saídas.',
  },
]

const settingsMenuItems: SettingsMenuItem[] = [
  {
    key: 'notifications',
    label: 'Notificações',
    description: 'Telefone, alertas e histórico de envios.',
    available: true,
  },
  {
    key: 'imports',
    label: 'Importação de extrato',
    description: 'Importe CSV/OFX com classificação inteligente.',
    available: true,
  },
]

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

export function Settings() {
  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(EMPTY_PREFERENCES)
  const [statementBank, setStatementBank] = useState<SupportedStatementBank>('NUBANK')
  const [statementBankAccountId, setStatementBankAccountId] = useState('')
  const [statementFileName, setStatementFileName] = useState('')
  const [statementCsvContent, setStatementCsvContent] = useState('')
  const [importResult, setImportResult] = useState<ImportStatementResponse | null>(null)
  const [statementImportProgress, setStatementImportProgress] = useState(0)
  const [statementImportStatus, setStatementImportStatus] = useState('')
  const [statementImportTimingLabel, setStatementImportTimingLabel] = useState('')
  const [creditCardStatementCardId, setCreditCardStatementCardId] = useState('')
  const [creditCardStatementFileName, setCreditCardStatementFileName] = useState('')
  const [creditCardStatementContent, setCreditCardStatementContent] = useState('')
  const [creditCardImportResult, setCreditCardImportResult] = useState<ImportCreditCardStatementResponse | null>(null)
  const [creditCardImportProgress, setCreditCardImportProgress] = useState(0)
  const [creditCardImportStatus, setCreditCardImportStatus] = useState('')
  const [creditCardImportTimingLabel, setCreditCardImportTimingLabel] = useState('')
  const [activeMenuKey, setActiveMenuKey] = useState('notifications')
  const statementImportRequestIdRef = useRef<string | null>(null)
  const creditCardImportRequestIdRef = useRef<string | null>(null)
  const { creditCards } = useCreditCards()

  const { data } = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: notificationsService.getSettings,
  })

  const { data: history = [], isFetching: isLoadingHistory } = useQuery({
    queryKey: ['notifications', 'history'],
    queryFn: () => notificationsService.getHistory(20),
  })

  useEffect(() => {
    if (!data) {
      return
    }

    setPhoneNumber(data.phoneNumber ?? '')
    setNotificationsEnabled(data.notificationsEnabled)
    setPreferences(data.preferences)
  }, [data])

  useEffect(() => {
    if (!accounts.length || statementBankAccountId) {
      return
    }

    setStatementBankAccountId(accounts[0].id)
  }, [accounts, statementBankAccountId])

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
      if (event.source === 'BANK_STATEMENT') {
        if (!statementImportRequestIdRef.current || event.requestId !== statementImportRequestIdRef.current) {
          return
        }

        setStatementImportProgress(event.progress)
        setStatementImportStatus(event.message || 'Processando extrato...')

        const etaLabel = event.etaMs && event.etaMs > 0
          ? ` • ETA ${formatSeconds(event.etaMs)}`
          : ''
        setStatementImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
        return
      }

      if (event.source === 'CREDIT_CARD_STATEMENT') {
        if (!creditCardImportRequestIdRef.current || event.requestId !== creditCardImportRequestIdRef.current) {
          return
        }

        setCreditCardImportProgress(event.progress)
        setCreditCardImportStatus(event.message || 'Processando fatura...')

        const etaLabel = event.etaMs && event.etaMs > 0
          ? ` • ETA ${formatSeconds(event.etaMs)}`
          : ''
        setCreditCardImportTimingLabel(`Tempo ${formatSeconds(event.elapsedMs)}${etaLabel}`)
      }
    }

    socket.on(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)

    return () => {
      socket.off(FINANCIAL_IMPORT_PROGRESS_SOCKET_EVENT, handleImportProgress)
      socket.disconnect()
    }
  }, [])

  const { mutateAsync: updateSettings, isLoading: isSaving } = useMutation(
    notificationsService.updateSettings,
  )

  const { mutateAsync: sendTest, isLoading: isSendingTest } = useMutation(
    notificationsService.sendTest,
  )

  const { mutateAsync: importStatement, isLoading: isImportingStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof transactionsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => transactionsService.importStatement(params, { onUploadProgress }),
  )

  const { mutateAsync: importCreditCardStatement, isLoading: isImportingCreditCardStatement } = useMutation(
    ({
      params,
      onUploadProgress,
    }: {
      params: Parameters<typeof creditCardsService.importStatement>[0]
      onUploadProgress?: (percentage: number) => void
    }) => creditCardsService.importStatement(params, { onUploadProgress }),
  )

  const canSave = useMemo(() => {
    if (!data) {
      return false
    }

    return (
      (data.phoneNumber ?? '') !== phoneNumber
      || data.notificationsEnabled !== notificationsEnabled
      || JSON.stringify(data.preferences) !== JSON.stringify(preferences)
    )
  }, [data, phoneNumber, notificationsEnabled, preferences])

  const enabledPreferencesCount = useMemo(() => (
    Object.values(preferences).filter(Boolean).length
  ), [preferences])

  const localPhoneDigitsCount = toLocalDigits(phoneNumber).length
  const phoneValidationError =
    phoneNumber && localPhoneDigitsCount !== 10 && localPhoneDigitsCount !== 11
      ? 'Use um número válido com DDD (10 ou 11 dígitos).'
      : ''

  const essentialPreferences = preferenceOptions.filter((preference) => (
    preference.key === 'dueReminders'
    || preference.key === 'creditCardDue'
    || preference.key === 'budgetAlerts'
  ))

  const optionalPreferences = preferenceOptions.filter((preference) => (
    preference.key === 'lowBalance'
    || preference.key === 'weeklySummary'
  ))

  async function handleSave() {
    try {
      await updateSettings({
        phoneNumber,
        notificationsEnabled,
        preferences,
      })

      queryClient.invalidateQueries({ queryKey: ['notifications', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })

      toast.success('Configurações de notificação salvas!')
    } catch {
      toast.error('Não foi possível salvar as configurações.')
    }
  }

  async function handleSendTest() {
    try {
      await sendTest({})
      queryClient.invalidateQueries({ queryKey: ['notifications', 'history'] })
      toast.success('Notificação de teste enviada no WhatsApp!')
    } catch {
      toast.error('Falha ao enviar notificação de teste.')
    }
  }

  async function handleImportStatement() {
    if (!statementBankAccountId || !statementCsvContent) {
      return
    }

    try {
      const requestId = crypto.randomUUID()
      statementImportRequestIdRef.current = requestId

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
      setStatementImportStatus('Importação concluída.')
      setStatementImportTimingLabel('')

      toast.success(`Extrato importado! ${response.importedCount} lançamento(s) criado(s).`)
    } catch {
      setStatementImportStatus('Falha na importação.')
      setStatementImportTimingLabel('')
      toast.error('Não foi possível importar o extrato. Confira o arquivo CSV/OFX/PDF e tente novamente.')
    } finally {
      setTimeout(() => {
        setStatementImportProgress(0)
        setStatementImportStatus('')
        setStatementImportTimingLabel('')
        statementImportRequestIdRef.current = null
      }, 1200)
    }
  }

  async function handleStatementFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setStatementFileName('')
      setStatementCsvContent('')
      return
    }

    const lowerCaseName = file.name.toLowerCase()
    const isPdf = lowerCaseName.endsWith('.pdf')
    const isCsvOrOfx = lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.ofx')
    const isSupportedStatementFile = isCsvOrOfx || isPdf

    if (!isSupportedStatementFile) {
      toast.error('Selecione um arquivo CSV, OFX ou PDF válido.')
      event.target.value = ''
      return
    }

    try {
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

      setStatementFileName(file.name)
      setStatementCsvContent(content)
      setImportResult(null)
    } catch {
      toast.error('Falha ao ler o arquivo. Tente novamente.')
    }
  }

  async function handleImportCreditCardStatement() {
    if (!creditCardStatementCardId || !creditCardStatementContent) {
      return
    }

    try {
      const requestId = crypto.randomUUID()
      creditCardImportRequestIdRef.current = requestId

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
      setCreditCardImportStatus('Importação concluída.')
      setCreditCardImportTimingLabel('')

      toast.success(`Fatura importada! ${response.importedCount} compra(s) e ${response.importedPaymentsCount ?? 0} pagamento(s).`)
    } catch {
      setCreditCardImportStatus('Falha na importação.')
      setCreditCardImportTimingLabel('')
      toast.error('Não foi possível importar a fatura do cartão. Confira o arquivo CSV/OFX e tente novamente.')
    } finally {
      setTimeout(() => {
        setCreditCardImportProgress(0)
        setCreditCardImportStatus('')
        setCreditCardImportTimingLabel('')
        creditCardImportRequestIdRef.current = null
      }, 1200)
    }
  }

  async function handleCreditCardStatementFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setCreditCardStatementFileName('')
      setCreditCardStatementContent('')
      return
    }

    const lowerCaseName = file.name.toLowerCase()
    const isCsvOrOfx = lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.ofx')

    if (!isCsvOrOfx) {
      toast.error('Selecione um arquivo CSV ou OFX válido.')
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()

      setCreditCardStatementFileName(file.name)
      setCreditCardStatementContent(content)
      setCreditCardImportResult(null)
    } catch {
      toast.error('Falha ao ler o arquivo. Tente novamente.')
    }
  }

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <header className="min-h-[48px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Logo className="h-6 text-teal-900" />

        <Link
          to="/"
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors w-full sm:w-auto text-center"
        >
          Voltar ao dashboard
        </Link>
      </header>

      <main className="max-w-[1120px] mx-auto mt-6">
        <div className="space-y-4">
          <SettingsHero
            enabledCount={enabledPreferencesCount}
            totalCount={preferenceOptions.length}
            notificationsEnabled={notificationsEnabled}
            hasEvolutionConfigured={Boolean(data?.hasEvolutionConfigured)}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start pb-24">
            <SettingsMenu
              items={settingsMenuItems}
              activeKey={activeMenuKey}
              onSelect={setActiveMenuKey}
            />

            {activeMenuKey === 'notifications' && (
              <NotificationsSettingsPanel
                notificationsEnabled={notificationsEnabled}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                phoneValidationError={phoneValidationError}
                setNotificationsEnabled={setNotificationsEnabled}
                essentialPreferences={essentialPreferences}
                optionalPreferences={optionalPreferences}
                preferences={preferences}
                setPreferences={setPreferences}
                handleSendTest={handleSendTest}
                isSendingTest={isSendingTest}
                hasEvolutionConfigured={data?.hasEvolutionConfigured}
                handleSave={handleSave}
                isSaving={isSaving}
                canSave={canSave}
                history={history}
                isLoadingHistory={isLoadingHistory}
                formatPhoneMask={formatPhoneMask}
                toStoragePhone={toStoragePhone}
              />
            )}

            {activeMenuKey === 'imports' && (
              <ImportsSettingsPanel
                statementBank={statementBank}
                setStatementBank={setStatementBank}
                statementBankAccountId={statementBankAccountId}
                setStatementBankAccountId={setStatementBankAccountId}
                accounts={accounts}
                handleStatementFileChange={handleStatementFileChange}
                statementFileName={statementFileName}
                handleImportStatement={handleImportStatement}
                isImportingStatement={isImportingStatement}
                statementCsvContent={statementCsvContent}
                statementImportStatus={statementImportStatus}
                statementImportProgress={statementImportProgress}
                statementImportTimingLabel={statementImportTimingLabel}
                importResult={importResult}
                creditCardStatementCardId={creditCardStatementCardId}
                setCreditCardStatementCardId={setCreditCardStatementCardId}
                creditCards={creditCards}
                handleCreditCardStatementFileChange={handleCreditCardStatementFileChange}
                creditCardStatementFileName={creditCardStatementFileName}
                handleImportCreditCardStatement={handleImportCreditCardStatement}
                isImportingCreditCardStatement={isImportingCreditCardStatement}
                creditCardStatementContent={creditCardStatementContent}
                creditCardImportStatus={creditCardImportStatus}
                creditCardImportProgress={creditCardImportProgress}
                creditCardImportTimingLabel={creditCardImportTimingLabel}
                creditCardImportResult={creditCardImportResult}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
