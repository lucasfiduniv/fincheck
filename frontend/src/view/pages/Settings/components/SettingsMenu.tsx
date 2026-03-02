import { cn } from '../../../../app/utils/cn'

export interface SettingsMenuItem {
  key: string
  label: string
  description: string
  available: boolean
}

interface SettingsMenuProps {
  items: SettingsMenuItem[]
  activeKey: string
  onSelect(key: string): void
}

export function SettingsMenu({ items, activeKey, onSelect }: SettingsMenuProps) {
  return (
    <aside className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2 xl:sticky xl:top-0">
      <span className="text-xs text-gray-500 uppercase tracking-[0.08em] px-2 block pt-1">
        Menu de configurações
      </span>

      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => item.available && onSelect(item.key)}
          disabled={!item.available}
          className={cn(
            'w-full text-left rounded-xl border px-3 py-3 transition-colors',
            item.key === activeKey
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:bg-gray-50',
            !item.available && 'opacity-60 cursor-not-allowed hover:bg-white',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm text-gray-800">{item.label}</strong>
            {!item.available && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                Em breve
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{item.description}</p>
        </button>
      ))}
    </aside>
  )
}
