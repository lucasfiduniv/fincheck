import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { notificationsService } from '../../../app/services/notificationsService'
import { toast } from 'react-hot-toast'
import { NotificationPreferences } from '../../../app/entities/NotificationSettings'
import { SettingsSection } from './components/SettingsSection'
import { SettingsToggleItem } from './components/SettingsToggleItem'
import { NotificationHistoryPanel } from './components/NotificationHistoryPanel'
import { SettingsHero } from './components/SettingsHero'
import { SettingsMenu, SettingsMenuItem } from './components/SettingsMenu'
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
  const [creditCardStatementCardId, setCreditCardStatementCardId] = useState('')
  const [creditCardStatementFileName, setCreditCardStatementFileName] = useState('')
  const [creditCardStatementContent, setCreditCardStatementContent] = useState('')
  const [creditCardImportResult, setCreditCardImportResult] = useState<ImportCreditCardStatementResponse | null>(null)
  const [activeMenuKey, setActiveMenuKey] = useState('notifications')
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

  const { mutateAsync: updateSettings, isLoading: isSaving } = useMutation(
    notificationsService.updateSettings,
  )

  const { mutateAsync: sendTest, isLoading: isSendingTest } = useMutation(
    notificationsService.sendTest,
  )

  const { mutateAsync: importStatement, isLoading: isImportingStatement } = useMutation(
    transactionsService.importStatement,
  )

  const { mutateAsync: importCreditCardStatement, isLoading: isImportingCreditCardStatement } = useMutation(
    creditCardsService.importStatement,
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
      const response = await importStatement({
        bank: statementBank,
        bankAccountId: statementBankAccountId,
        csvContent: statementCsvContent,
      })

      setImportResult(response)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }),
        queryClient.invalidateQueries({ queryKey: ['categoryBudgets'] }),
        queryClient.invalidateQueries({ queryKey: ['transactionDueAlerts'] }),
      ])

      toast.success(`Extrato importado! ${response.importedCount} lançamento(s) criado(s).`)
    } catch {
      toast.error('Não foi possível importar o extrato. Confira o arquivo CSV/OFX e tente novamente.')
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
    const isCsvOrOfx = lowerCaseName.endsWith('.csv') || lowerCaseName.endsWith('.ofx')

    if (!isCsvOrOfx) {
      toast.error('Selecione um arquivo CSV ou OFX válido.')
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()

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
      const response = await importCreditCardStatement({
        creditCardId: creditCardStatementCardId,
        bank: 'NUBANK',
        csvContent: creditCardStatementContent,
      })

      setCreditCardImportResult(response)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creditCards'] }),
        queryClient.invalidateQueries({ queryKey: ['creditCardStatement'] }),
      ])

      toast.success(`Fatura importada! ${response.importedCount} compra(s) criada(s).`)
    } catch {
      toast.error('Não foi possível importar a fatura do cartão. Confira o arquivo CSV/OFX e tente novamente.')
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
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
                <div className="space-y-4">
                  <SettingsSection
                    title="1. Ativar notificações"
                    description="Defina seu WhatsApp e ative o envio automático de alertas."
                  >
                    <div className="space-y-3">
                      <Input
                        name="phoneNumber"
                        placeholder="Telefone (WhatsApp)"
                        value={formatPhoneMask(phoneNumber)}
                        onChange={(event) => setPhoneNumber(toStoragePhone(event.target.value))}
                      />

                      <p className="text-xs text-gray-600">Use número com DDD.</p>

                      {phoneValidationError && (
                        <p className="text-xs text-red-800">{phoneValidationError}</p>
                      )}

                      <SettingsToggleItem
                        title="Habilitar notificações"
                        description="Ativa envio de alertas automáticos para seu WhatsApp."
                        checked={notificationsEnabled}
                        onChange={setNotificationsEnabled}
                      />
                    </div>
                  </SettingsSection>

                  <SettingsSection
                    title="2. Quais alertas receber"
                    description="Ajuste os alertas essenciais e opcionais do seu dia a dia."
                  >
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-[0.08em]">Essenciais</span>
                        <div className="mt-2 space-y-2">
                          {essentialPreferences.map((preference) => (
                            <SettingsToggleItem
                              key={preference.key}
                              title={preference.title}
                              description={preference.description}
                              checked={preferences[preference.key]}
                              disabled={!notificationsEnabled}
                              onChange={(checked) => {
                                setPreferences((prevState) => ({
                                  ...prevState,
                                  [preference.key]: checked,
                                }))
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-[0.08em]">Opcionais</span>
                        <div className="mt-2 space-y-2">
                          {optionalPreferences.map((preference) => (
                            <SettingsToggleItem
                              key={preference.key}
                              title={preference.title}
                              description={preference.description}
                              checked={preferences[preference.key]}
                              disabled={!notificationsEnabled}
                              onChange={(checked) => {
                                setPreferences((prevState) => ({
                                  ...prevState,
                                  [preference.key]: checked,
                                }))
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </SettingsSection>

                  <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-4">
                    <div className="flex flex-col lg:flex-row gap-3 lg:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSendTest}
                        isLoading={isSendingTest}
                        disabled={!phoneNumber || !!phoneValidationError || !data?.hasEvolutionConfigured}
                        className="w-full lg:w-auto"
                      >
                        Enviar teste
                      </Button>

                      <Button
                        type="button"
                        onClick={handleSave}
                        isLoading={isSaving}
                        disabled={!canSave || !!phoneValidationError}
                        className="w-full lg:w-auto"
                      >
                        Salvar configurações
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:sticky xl:top-0">
                  <SettingsSection title="Histórico">
                    <NotificationHistoryPanel
                      history={history}
                      isLoading={isLoadingHistory}
                    />
                  </SettingsSection>
                </div>
              </div>
            )}

            {activeMenuKey === 'imports' && (
              <div className="space-y-4">
                <SettingsSection
                  title="Importar extrato do banco"
                  description="Importe CSV ou OFX do Nubank e crie lançamentos automaticamente com classificação inteligente."
                >
                  <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 space-y-2">
                    <strong className="text-sm text-teal-900 block">O que acontece ao importar</strong>
                    <ul className="text-sm text-teal-900 space-y-1 list-disc pl-5">
                      <li>lê o arquivo CSV/OFX e transforma em lançamentos válidos</li>
                      <li>remove duplicados já importados para evitar repetição</li>
                      <li>identifica transferências (incluindo Pix entre suas contas)</li>
                      <li>detecta pagamentos de fatura de cartão</li>
                      <li>usa IA + suas categorias para melhorar descrição e categoria</li>
                    </ul>
                    <p className="text-xs text-teal-800">
                      Se a IA não tiver confiança suficiente, o sistema usa fallback seguro e mantém o lançamento com categoria padrão.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Select
                      placeholder="Banco"
                      value={statementBank}
                      onChange={(value) => setStatementBank(value as SupportedStatementBank)}
                      options={[{ value: 'NUBANK', label: 'Nubank (CSV/OFX)' }]}
                    />

                    <Select
                      placeholder="Conta de destino"
                      value={statementBankAccountId}
                      onChange={setStatementBankAccountId}
                      options={accounts.map((account) => ({
                        value: account.id,
                        label: account.name,
                      }))}
                    />

                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-gray-700">Arquivo (.csv ou .ofx)</span>
                      <input
                        type="file"
                        accept=".csv,.ofx,text/csv,application/x-ofx"
                        onChange={handleStatementFileChange}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 hover:file:bg-gray-200"
                      />
                    </label>

                    {statementFileName && (
                      <p className="text-xs text-gray-600">Arquivo selecionado: {statementFileName}</p>
                    )}

                    <Button
                      type="button"
                      onClick={handleImportStatement}
                      isLoading={isImportingStatement}
                      disabled={!statementBankAccountId || !statementCsvContent}
                      className="w-full lg:w-auto"
                    >
                      Importar extrato
                    </Button>

                    {importResult && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <p>Total de linhas: <strong>{importResult.totalRows}</strong></p>
                        <p>Linhas únicas: <strong>{importResult.uniqueRows}</strong></p>
                        <p>Importadas: <strong>{importResult.importedCount}</strong></p>
                        <p>Ignoradas (duplicadas): <strong>{importResult.skippedCount}</strong></p>
                        <p>Falharam: <strong>{importResult.failedCount}</strong></p>
                        {typeof importResult.aiEnhancedCount === 'number' && (
                          <p>Enriquecidas por IA: <strong>{importResult.aiEnhancedCount}</strong></p>
                        )}
                        {typeof importResult.transferDetectedCount === 'number' && (
                          <p>Transferências detectadas: <strong>{importResult.transferDetectedCount}</strong></p>
                        )}
                        {typeof importResult.cardBillPaymentDetectedCount === 'number' && (
                          <p>Pagamentos de fatura detectados: <strong>{importResult.cardBillPaymentDetectedCount}</strong></p>
                        )}
                      </div>
                    )}
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Importar fatura de cartão"
                  description="Importe CSV ou OFX do Nubank para criar compras no cartão selecionado."
                >
                  <div className="space-y-3">
                    <Select
                      placeholder="Cartão"
                      value={creditCardStatementCardId}
                      onChange={setCreditCardStatementCardId}
                      options={creditCards.map((card) => ({
                        value: card.id,
                        label: card.name,
                      }))}
                    />

                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-gray-700">Arquivo da fatura (.csv ou .ofx)</span>
                      <input
                        type="file"
                        accept=".csv,.ofx,text/csv,application/x-ofx"
                        onChange={handleCreditCardStatementFileChange}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-800 hover:file:bg-gray-200"
                      />
                    </label>

                    {creditCardStatementFileName && (
                      <p className="text-xs text-gray-600">Arquivo selecionado: {creditCardStatementFileName}</p>
                    )}

                    <Button
                      type="button"
                      onClick={handleImportCreditCardStatement}
                      isLoading={isImportingCreditCardStatement}
                      disabled={!creditCardStatementCardId || !creditCardStatementContent}
                      className="w-full lg:w-auto"
                    >
                      Importar fatura do cartão
                    </Button>

                    {creditCardImportResult && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <p>Total de linhas: <strong>{creditCardImportResult.totalRows}</strong></p>
                        <p>Linhas únicas: <strong>{creditCardImportResult.uniqueRows}</strong></p>
                        <p>Importadas: <strong>{creditCardImportResult.importedCount}</strong></p>
                        <p>Ignoradas (duplicadas): <strong>{creditCardImportResult.skippedCount}</strong></p>
                        <p>Falharam: <strong>{creditCardImportResult.failedCount}</strong></p>
                      </div>
                    )}
                  </div>
                </SettingsSection>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
