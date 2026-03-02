import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { notificationsService } from '../../../app/services/notificationsService'
import { toast } from 'react-hot-toast'
import { NotificationPreferences } from '../../../app/entities/NotificationSettings'

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

const statusConfig: Record<'PENDING' | 'SENT' | 'FAILED', { label: string; className: string }> = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800',
  },
  SENT: {
    label: 'Enviado',
    className: 'bg-green-100 text-green-800',
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-100 text-red-800',
  },
}

const typeLabel: Record<string, string> = {
  GENERAL: 'Geral',
  DUE_REMINDERS: 'Vencimentos',
  CREDIT_CARD_DUE: 'Fatura do cartão',
  BUDGET_ALERTS: 'Orçamento',
  LOW_BALANCE: 'Saldo baixo',
  WEEKLY_SUMMARY: 'Resumo semanal',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Settings() {
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(EMPTY_PREFERENCES)

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
        <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-[-0.8px]">
              Configurações de Notificações
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure seu telefone e controle alertas pelo WhatsApp.
            </p>
          </div>

          {!data?.hasEvolutionConfigured && !isLoading && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              O servidor ainda não está com Evolution API configurada. Você pode salvar o telefone,
              mas o envio de notificações ficará indisponível até ajustar as variáveis de ambiente.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <Input
                name="phoneNumber"
                placeholder="Telefone (WhatsApp)"
                value={formatPhoneMask(phoneNumber)}
                onChange={(event) => setPhoneNumber(toStoragePhone(event.target.value))}
              />
            </div>

            <label className="lg:col-span-2 rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between cursor-pointer">
              <div>
                <strong className="text-sm text-gray-800 block">Habilitar notificações</strong>
                <span className="text-xs text-gray-600">
                  Ativa envio de alertas automáticos para seu WhatsApp.
                </span>
              </div>

              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(event) => setNotificationsEnabled(event.target.checked)}
                className="w-5 h-5 accent-teal-900"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 lg:p-5 space-y-3">
            <div>
              <strong className="text-sm text-gray-800 block">Menu de notificações</strong>
              <span className="text-xs text-gray-600">
                Escolha exatamente quais alertas você quer receber.
              </span>
            </div>

            <div className="space-y-2">
              {preferenceOptions.map((preference) => (
                <label
                  key={preference.key}
                  className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="pr-3">
                    <strong className="text-sm text-gray-800 block">{preference.title}</strong>
                    <span className="text-xs text-gray-600">{preference.description}</span>
                  </div>

                  <input
                    type="checkbox"
                    checked={preferences[preference.key]}
                    onChange={(event) => {
                      setPreferences((prevState) => ({
                        ...prevState,
                        [preference.key]: event.target.checked,
                      }))
                    }}
                    className="w-5 h-5 accent-teal-900"
                  />
                </label>
              ))}
            </div>
          </div>

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

          <div className="rounded-2xl border border-gray-200 p-4 lg:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-sm text-gray-800 block">Central de notificações</strong>
                <span className="text-xs text-gray-600">
                  Histórico de envios no app (WhatsApp): enviados, falhas e pendentes.
                </span>
              </div>

              {isLoadingHistory && (
                <span className="text-xs text-gray-500">Atualizando...</span>
              )}
            </div>

            {history.length === 0 && !isLoadingHistory && (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                Ainda não há eventos de notificação para este usuário.
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {history.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600 truncate">
                        {typeLabel[event.type] ?? event.type}
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[event.status].className}`}>
                        {statusConfig[event.status].label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800">{event.message}</p>

                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>Destino: +{event.destination}</p>
                      <p>Criado em: {formatDateTime(event.createdAt)}</p>
                      {event.sentAt && <p>Enviado em: {formatDateTime(event.sentAt)}</p>}
                      {event.errorMessage && (
                        <p className="text-red-800">Erro: {event.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
