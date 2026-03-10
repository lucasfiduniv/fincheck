import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { NotificationPreferences } from '../../../../app/entities/NotificationSettings'
import { notificationsService } from '../../../../app/services/notificationsService'

const EMPTY_PREFERENCES: NotificationPreferences = {
  dueReminders: true,
  creditCardDue: true,
  budgetAlerts: true,
  lowBalance: false,
  weeklySummary: false,
}

const PREFERENCE_OPTIONS: Array<{
  key: keyof NotificationPreferences
  title: string
  description: string
}> = [
  {
    key: 'dueReminders',
    title: 'Vencimentos proximos',
    description: 'Avisa quando recorrencias e parcelas estiverem perto do vencimento.',
  },
  {
    key: 'creditCardDue',
    title: 'Fatura do cartao',
    description: 'Receba lembrete antes da data de pagamento da fatura.',
  },
  {
    key: 'budgetAlerts',
    title: 'Alertas de orcamento',
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
    description: 'Envia um resumo da semana com entradas e saidas.',
  },
]

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

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function useNotificationSettingsController() {
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(EMPTY_PREFERENCES)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

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

  const { mutateAsync: updateSettings } = useMutation(notificationsService.updateSettings)
  const { mutateAsync: sendTest, isLoading: isSendingTest } = useMutation(notificationsService.sendTest)

  const localPhoneDigitsCount = toLocalDigits(phoneNumber).length

  const phoneValidationError = useMemo(() => {
    if (notificationsEnabled && !phoneNumber) {
      return 'Informe um numero de WhatsApp para ativar notificacoes.'
    }

    if (phoneNumber && localPhoneDigitsCount !== 10 && localPhoneDigitsCount !== 11) {
      return 'Use um numero valido com DDD (10 ou 11 digitos).'
    }

    return ''
  }, [phoneNumber, notificationsEnabled, localPhoneDigitsCount])

  const canSendTest = Boolean(phoneNumber)
    && !phoneValidationError
    && Boolean(data?.hasEvolutionConfigured)

  const hasUnsavedChanges = useMemo(() => {
    if (!data) {
      return false
    }

    return (
      (data.phoneNumber ?? '') !== phoneNumber
      || data.notificationsEnabled !== notificationsEnabled
      || JSON.stringify(data.preferences) !== JSON.stringify(preferences)
    )
  }, [data, phoneNumber, notificationsEnabled, preferences])

  useEffect(() => {
    if (!data || !hasUnsavedChanges) {
      return
    }

    setSaveState('dirty')
  }, [data, hasUnsavedChanges])

  useEffect(() => {
    if (!data || !hasUnsavedChanges || phoneValidationError) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSaveState('saving')

        const payload = {
          phoneNumber,
          notificationsEnabled,
          preferences,
        }

        await updateSettings(payload)

        queryClient.setQueryData(['notifications', 'settings'], (current: typeof data | undefined) => {
          if (!current) {
            return current
          }

          return {
            ...current,
            ...payload,
          }
        })

        setSaveState('saved')
        setLastSavedAt(new Date())
      } catch {
        setSaveState('error')
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [
    data,
    hasUnsavedChanges,
    notificationsEnabled,
    phoneNumber,
    phoneValidationError,
    preferences,
    queryClient,
    updateSettings,
  ])

  async function handleSendTest() {
    if (!canSendTest) {
      return
    }

    try {
      await sendTest({})
      queryClient.invalidateQueries({ queryKey: ['notifications', 'history'] })
      toast.success('Notificacao de teste enviada no WhatsApp!')
    } catch {
      toast.error('Falha ao enviar notificacao de teste.')
    }
  }

  const enabledPreferencesCount = useMemo(() => (
    Object.values(preferences).filter(Boolean).length
  ), [preferences])

  const essentialPreferences = useMemo(() => PREFERENCE_OPTIONS.filter((preference) => (
    preference.key === 'dueReminders'
    || preference.key === 'creditCardDue'
    || preference.key === 'budgetAlerts'
  )), [])

  const optionalPreferences = useMemo(() => PREFERENCE_OPTIONS.filter((preference) => (
    preference.key === 'lowBalance'
    || preference.key === 'weeklySummary'
  )), [])

  const autosaveLabel = useMemo(() => {
    if (saveState === 'saving') {
      return 'Salvando alteracoes...'
    }

    if (saveState === 'error') {
      return 'Falha ao salvar automaticamente. Continue editando para tentar novamente.'
    }

    if (saveState === 'saved') {
      if (!lastSavedAt || Date.now() - lastSavedAt.getTime() <= 15000) {
        return 'Salvo agora'
      }

      return `Salvo as ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }

    if (saveState === 'dirty') {
      return 'Alteracoes pendentes. Salvamento automatico em andamento.'
    }

    return 'Sem alteracoes pendentes.'
  }, [lastSavedAt, saveState])

  return {
    phoneNumber,
    setPhoneNumber,
    notificationsEnabled,
    setNotificationsEnabled,
    preferences,
    setPreferences,
    phoneValidationError,
    canSendTest,
    hasEvolutionConfigured: Boolean(data?.hasEvolutionConfigured),
    handleSendTest,
    isSendingTest,
    history,
    isLoadingHistory,
    formatPhoneMask,
    toStoragePhone,
    essentialPreferences,
    optionalPreferences,
    enabledPreferencesCount,
    totalPreferencesCount: PREFERENCE_OPTIONS.length,
    autosaveLabel,
  }
}
