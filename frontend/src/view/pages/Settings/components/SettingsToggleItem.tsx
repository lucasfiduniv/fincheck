interface SettingsToggleItemProps {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange(checked: boolean): void
}

export function SettingsToggleItem({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: SettingsToggleItemProps) {
  return (
    <label className={`rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}>
      <div className="pr-2">
        <strong className="text-sm text-gray-800 block">{title}</strong>
        <span className="text-xs text-gray-600">{description}</span>
      </div>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="w-5 h-5 accent-teal-900"
      />
    </label>
  )
}
