import { useState } from 'react'

interface SettingsHeroProps {
  enabledCount: number
  totalCount: number
  notificationsEnabled: boolean
  hasEvolutionConfigured: boolean
}

export function SettingsHero({
  enabledCount,
  totalCount,
  notificationsEnabled,
  hasEvolutionConfigured,
}: SettingsHeroProps) {
  const [showIntegrationDetails, setShowIntegrationDetails] = useState(false)

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-[-1px]">Configurações</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie notificações e preferências de comunicação.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasEvolutionConfigured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-900'}`}>
            Integração: {hasEvolutionConfigured ? 'OK' : 'Pendente'}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${notificationsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
            {notificationsEnabled ? 'Notificações ativas' : 'Notificações pausadas'}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-medium">
            {enabledCount}/{totalCount} alertas
          </span>
        </div>
      </div>

      {!hasEvolutionConfigured && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-teal-700 hover:text-teal-800 underline"
            onClick={() => setShowIntegrationDetails((state) => !state)}
          >
            {showIntegrationDetails ? 'Ocultar detalhes da integração' : 'Ver detalhes da integração'}
          </button>

          {showIntegrationDetails && (
            <div className="mt-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              O servidor ainda não está com Evolution API configurada. Você pode salvar o telefone,
              mas o envio de notificações ficará indisponível até ajustar as variáveis de ambiente.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
