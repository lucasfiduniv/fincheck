import { cn } from '../../../../app/utils/cn'

interface SettingsSectionProps {
  title: string
  description?: string
  rightContent?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function SettingsSection({
  title,
  description,
  rightContent,
  className,
  children,
}: SettingsSectionProps) {
  return (
    <section className={cn('bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 space-y-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 tracking-[-0.5px]">{title}</h2>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>

        {rightContent}
      </header>

      {children}
    </section>
  )
}
