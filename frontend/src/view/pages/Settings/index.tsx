import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { notificationsService } from '../../../app/services/notificationsService'
import { toast } from 'react-hot-toast'
import { NotificationPreferences } from '../../../app/entities/NotificationSettings'
import { SettingsSection } from './components/SettingsSection'
import { SettingsToggleItem } from './components/SettingsToggleItem'
import { NotificationHistoryPanel } from './components/NotificationHistoryPanel'
import { SettingsHero } from './components/SettingsHero'
import { SettingsMenu, SettingsMenuItem } from './components/SettingsMenu'

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
    description: 'WhatsApp, alertas e histórico de envio.',
    available: true,
  },
  {
    key: 'account',
    label: 'Conta',
    description: 'Dados pessoais e preferências da conta.',
    available: false,
  },
  {
    key: 'security',
    label: 'Segurança',
    description: 'Senha, sessão e proteção da conta.',
    available: false,
  },
]

export function Settings() {
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(EMPTY_PREFERENCES)
  const [activeMenuKey, setActiveMenuKey] = useState('notifications')

  const { data, isLoading } = useQuery({
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

  const { mutateAsync: updateSettings, isLoading: isSaving } = useMutation(
    notificationsService.updateSettings,
  )

  const { mutateAsync: sendTest, isLoading: isSendingTest } = useMutation(
    notificationsService.sendTest,
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

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <header className="h-12 flex items-center justify-between">
        <Logo className="h-6 text-teal-900" />

        <Link
          to="/"
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Voltar ao dashboard
        </Link>
      </header>

      <main className="max-w-[840px] mx-auto mt-6">
        <div className="space-y-4">
          <SettingsHero
            enabledCount={enabledPreferencesCount}
            totalCount={preferenceOptions.length}
            notificationsEnabled={notificationsEnabled}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start">
            <SettingsMenu
              items={settingsMenuItems}
              activeKey={activeMenuKey}
              onSelect={setActiveMenuKey}
            />

            {activeMenuKey === 'notifications' && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
                <div className="space-y-4">
                  <SettingsSection
                    title="Canal de envio"
                    description="Configure seu telefone e a ativação geral de notificações via WhatsApp."
                  >
                    <div className="space-y-3">
                      <Input
                        name="phoneNumber"
                        placeholder="Telefone (WhatsApp)"
                        value={formatPhoneMask(phoneNumber)}
                        onChange={(event) => setPhoneNumber(toStoragePhone(event.target.value))}
                      />

                      <SettingsToggleItem
                        title="Habilitar notificações"
                        description="Ativa envio de alertas automáticos para seu WhatsApp."
                        checked={notificationsEnabled}
                        onChange={setNotificationsEnabled}
                      />
                    </div>
                  </SettingsSection>

                  <SettingsSection
                    title="Preferências"
                    description="Escolha exatamente quais alertas você quer receber."
                  >
                    <div className="space-y-2">
                      {preferenceOptions.map((preference) => (
                        <SettingsToggleItem
                          key={preference.key}
                          title={preference.title}
                          description={preference.description}
                          checked={preferences[preference.key]}
                          onChange={(checked) => {
                            setPreferences((prevState) => ({
                              ...prevState,
                              [preference.key]: checked,
                            }))
                          }}
                        />
                      ))}
                    </div>
                  </SettingsSection>

                  <SettingsSection title="Ações">
                    <div className="flex flex-col lg:flex-row gap-3 lg:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSendTest}
                        isLoading={isSendingTest}
                        disabled={!phoneNumber || !data?.hasEvolutionConfigured}
                        className="w-full lg:w-auto"
                      >
                        Enviar teste
                      </Button>

                      <Button
                        type="button"
                        onClick={handleSave}
                        isLoading={isSaving}
                        disabled={!canSave}
                        className="w-full lg:w-auto"
                      >
                        Salvar configurações
                      </Button>
                    </div>
                  </SettingsSection>
                </div>

                <div className="space-y-4 xl:sticky xl:top-0">
                  {!data?.hasEvolutionConfigured && !isLoading && (
                    <SettingsSection title="Status da integração">
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                        O servidor ainda não está com Evolution API configurada. Você pode salvar o telefone,
                        mas o envio de notificações ficará indisponível até ajustar as variáveis de ambiente.
                      </div>
                    </SettingsSection>
                  )}

                  <SettingsSection title="Histórico">
                    <NotificationHistoryPanel
                      history={history}
                      isLoading={isLoadingHistory}
                    />
                  </SettingsSection>
                </div>
              </div>
            )}

            {activeMenuKey !== 'notifications' && (
              <SettingsSection
                title="Em breve"
                description="Esta seção já está preparada no menu e será implementada nos próximos passos."
              >
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  Por enquanto, apenas as configurações de notificações estão disponíveis.
                </div>
              </SettingsSection>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
