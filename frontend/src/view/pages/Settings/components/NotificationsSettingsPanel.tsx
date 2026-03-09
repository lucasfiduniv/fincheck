import { NotificationPreferences } from '../../../../app/entities/NotificationSettings'
import { NotificationEvent } from '../../../../app/entities/NotificationEvent'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { NotificationHistoryPanel } from './NotificationHistoryPanel'
import { SettingsSection } from './SettingsSection'
import { SettingsToggleItem } from './SettingsToggleItem'

interface PreferenceOption {
  key: keyof NotificationPreferences
  title: string
  description: string
}

interface NotificationsSettingsPanelProps {
  notificationsEnabled: boolean
  phoneNumber: string
  setPhoneNumber: (value: string) => void
  phoneValidationError: string
  setNotificationsEnabled: (value: boolean) => void
  essentialPreferences: PreferenceOption[]
  optionalPreferences: PreferenceOption[]
  preferences: NotificationPreferences
  setPreferences: (value: NotificationPreferences | ((prevState: NotificationPreferences) => NotificationPreferences)) => void
  handleSendTest: () => Promise<void>
  isSendingTest: boolean
  hasEvolutionConfigured?: boolean
  handleSave: () => Promise<void>
  isSaving: boolean
  canSave: boolean
  history: NotificationEvent[]
  isLoadingHistory: boolean
  formatPhoneMask: (value: string) => string
  toStoragePhone: (value: string) => string
}

export function NotificationsSettingsPanel({
  phoneNumber,
  setPhoneNumber,
  phoneValidationError,
  notificationsEnabled,
  setNotificationsEnabled,
  essentialPreferences,
  optionalPreferences,
  preferences,
  setPreferences,
  handleSendTest,
  isSendingTest,
  hasEvolutionConfigured,
  handleSave,
  isSaving,
  canSave,
  history,
  isLoadingHistory,
  formatPhoneMask,
  toStoragePhone,
}: NotificationsSettingsPanelProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
      <div className="space-y-4">
        <SettingsSection
          title="1. Ativar notificacoes"
          description="Defina seu WhatsApp e ative o envio automatico de alertas."
        >
          <div className="space-y-3">
            <Input
              name="phoneNumber"
              placeholder="Telefone (WhatsApp)"
              value={formatPhoneMask(phoneNumber)}
              onChange={(event) => setPhoneNumber(toStoragePhone(event.target.value))}
            />

            <p className="text-xs text-gray-600">Use numero com DDD.</p>

            {phoneValidationError && (
              <p className="text-xs text-red-800">{phoneValidationError}</p>
            )}

            <SettingsToggleItem
              title="Habilitar notificacoes"
              description="Ativa envio de alertas automaticos para seu WhatsApp."
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
              disabled={!phoneNumber || !!phoneValidationError || !hasEvolutionConfigured}
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
              Salvar configuracoes
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-0">
        <SettingsSection title="Historico">
          <NotificationHistoryPanel
            history={history}
            isLoading={isLoadingHistory}
          />
        </SettingsSection>
      </div>
    </div>
  )
}
