interface SettingsHeroProps {
  enabledCount: number
  totalCount: number
  notificationsEnabled: boolean
}

export function SettingsHero({
  enabledCount,
  totalCount,
  notificationsEnabled,
}: SettingsHeroProps) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-[-1px]">Configurações</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie notificações e preferências de comunicação.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${notificationsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
            {notificationsEnabled ? 'Notificações ativas' : 'Notificações pausadas'}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-medium">
            {enabledCount}/{totalCount} alertas
          </span>
        </div>
      </div>
    </section>
  )
}
