import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { notificationsService } from '../../../app/services/notificationsService'
import { toast } from 'react-hot-toast'

function normalizePhoneInput(value: string) {
  return value.replace(/[^0-9]/g, '')
}

export function Settings() {
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: notificationsService.getSettings,
  })

  useEffect(() => {
    if (!data) {
      return
    }

    setPhoneNumber(data.phoneNumber ?? '')
    setNotificationsEnabled(data.notificationsEnabled)
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
    )
  }, [data, phoneNumber, notificationsEnabled])

  async function handleSave() {
    try {
      await updateSettings({
        phoneNumber,
        notificationsEnabled,
      })

      queryClient.invalidateQueries({ queryKey: ['notifications', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })

      toast.success('Configurações de notificação salvas!')
    } catch {
      toast.error('Não foi possível salvar as configurações.')
    }
  }

  async function handleSendTest() {
    try {
      await sendTest({})
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
                placeholder="Telefone com DDI (ex.: 5542991317112)"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(normalizePhoneInput(event.target.value))}
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
        </div>
      </main>
    </div>
  )
}
