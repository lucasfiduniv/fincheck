import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { SettingsHero } from './components/SettingsHero'
import { SettingsMenu, SettingsMenuItem } from './components/SettingsMenu'
import { NotificationsSettingsPanel } from './components/NotificationsSettingsPanel'
import { ImportsSettingsPanel } from './components/ImportsSettingsPanel'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCreditCards } from '../../../app/hooks/useCreditCards'
import { useNotificationSettingsController } from './hooks/useNotificationSettingsController'
import { useStatementImportController } from './hooks/useStatementImportController'
import { useCreditCardImportController } from './hooks/useCreditCardImportController'

const settingsMenuItems: SettingsMenuItem[] = [
  {
    key: 'notifications',
    label: 'Notificacoes',
    description: 'Telefone, alertas e historico de envios.',
    available: true,
    group: 'current',
  },
  {
    key: 'imports',
    label: 'Importacao de extrato',
    description: 'Importe CSV/OFX com classificacao inteligente.',
    available: true,
    group: 'current',
  },
  {
    key: 'profile',
    label: 'Perfil',
    description: 'Dados pessoais e preferencias basicas da conta.',
    available: false,
    group: 'upcoming',
  },
  {
    key: 'security',
    label: 'Seguranca',
    description: 'Senha, sessoes ativas e controles de acesso.',
    available: false,
    group: 'upcoming',
  },
  {
    key: 'ai',
    label: 'Preferencias de IA',
    description: 'Sugestoes automaticas e nivel de autonomia.',
    available: false,
    group: 'upcoming',
  },
  {
    key: 'privacy',
    label: 'Dados e privacidade',
    description: 'Exportacao, retencao e controle de dados.',
    available: false,
    group: 'upcoming',
  },
]

export function Settings() {
  const [activeMenuKey, setActiveMenuKey] = useState('notifications')
  const { accounts } = useBankAccounts()
  const { creditCards } = useCreditCards()

  const notificationsController = useNotificationSettingsController()
  const statementImportController = useStatementImportController(accounts)
  const creditCardImportController = useCreditCardImportController(creditCards)

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
            enabledCount={notificationsController.enabledPreferencesCount}
            totalCount={notificationsController.totalPreferencesCount}
            notificationsEnabled={notificationsController.notificationsEnabled}
            hasEvolutionConfigured={notificationsController.hasEvolutionConfigured}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start pb-24">
            <SettingsMenu
              items={settingsMenuItems}
              activeKey={activeMenuKey}
              onSelect={setActiveMenuKey}
            />

            {activeMenuKey === 'notifications' && (
              <NotificationsSettingsPanel
                notificationsEnabled={notificationsController.notificationsEnabled}
                phoneNumber={notificationsController.phoneNumber}
                setPhoneNumber={notificationsController.setPhoneNumber}
                phoneValidationError={notificationsController.phoneValidationError}
                setNotificationsEnabled={notificationsController.setNotificationsEnabled}
                essentialPreferences={notificationsController.essentialPreferences}
                optionalPreferences={notificationsController.optionalPreferences}
                preferences={notificationsController.preferences}
                setPreferences={notificationsController.setPreferences}
                handleSendTest={notificationsController.handleSendTest}
                isSendingTest={notificationsController.isSendingTest}
                canSendTest={notificationsController.canSendTest}
                hasEvolutionConfigured={notificationsController.hasEvolutionConfigured}
                autosaveLabel={notificationsController.autosaveLabel}
                history={notificationsController.history}
                isLoadingHistory={notificationsController.isLoadingHistory}
                formatPhoneMask={notificationsController.formatPhoneMask}
                toStoragePhone={notificationsController.toStoragePhone}
              />
            )}

            {activeMenuKey === 'imports' && (
              <ImportsSettingsPanel
                statementBank={statementImportController.statementBank}
                setStatementBank={statementImportController.setStatementBank}
                statementBankAccountId={statementImportController.statementBankAccountId}
                setStatementBankAccountId={statementImportController.setStatementBankAccountId}
                accounts={accounts}
                handleStatementFileChange={statementImportController.handleStatementFileChange}
                statementFileName={statementImportController.statementFileName}
                statementImportError={statementImportController.statementImportError}
                statementFilePreview={statementImportController.statementFilePreview}
                acceptedFormatsLabel={statementImportController.acceptedFormatsLabel}
                handleImportStatement={statementImportController.handleImportStatement}
                isImportingStatement={statementImportController.isImportingStatement}
                statementCsvContent={statementImportController.statementCsvContent}
                statementImportStatus={statementImportController.statementImportStatus}
                statementImportProgress={statementImportController.statementImportProgress}
                statementImportTimingLabel={statementImportController.statementImportTimingLabel}
                importResult={statementImportController.importResult}
                creditCardStatementCardId={creditCardImportController.creditCardStatementCardId}
                setCreditCardStatementCardId={creditCardImportController.setCreditCardStatementCardId}
                creditCards={creditCards}
                handleCreditCardStatementFileChange={creditCardImportController.handleCreditCardStatementFileChange}
                creditCardStatementFileName={creditCardImportController.creditCardStatementFileName}
                creditCardImportError={creditCardImportController.creditCardImportError}
                creditCardPreview={creditCardImportController.creditCardPreview}
                handleImportCreditCardStatement={creditCardImportController.handleImportCreditCardStatement}
                isImportingCreditCardStatement={creditCardImportController.isImportingCreditCardStatement}
                creditCardStatementContent={creditCardImportController.creditCardStatementContent}
                creditCardImportStatus={creditCardImportController.creditCardImportStatus}
                creditCardImportProgress={creditCardImportController.creditCardImportProgress}
                creditCardImportTimingLabel={creditCardImportController.creditCardImportTimingLabel}
                creditCardImportResult={creditCardImportController.creditCardImportResult}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
