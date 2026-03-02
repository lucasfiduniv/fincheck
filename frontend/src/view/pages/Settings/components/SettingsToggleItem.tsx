interface SettingsToggleItemProps {
  title: string
  description: string
  checked: boolean
  onChange(checked: boolean): void
}

export function SettingsToggleItem({
  title,
  description,
  checked,
  onChange,
}: SettingsToggleItemProps) {
  return (
    <label className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between cursor-pointer gap-4">
      <div className="pr-2">
        <strong className="text-sm text-gray-800 block">{title}</strong>
        <span className="text-xs text-gray-600">{description}</span>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-5 h-5 accent-teal-900"
      />
    </label>
  )
}
