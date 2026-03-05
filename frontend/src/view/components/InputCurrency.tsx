import { CrossCircledIcon } from '@radix-ui/react-icons'
import { cn } from '../../app/utils/cn'
import CurrencyInput from 'react-currency-input-field'

interface InputCurrencyProps {
  error?: string
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
  className?: string
  onChange(value?: string): void
}

export function InputCurrency({
  error, value, onChange, className, defaultValue, placeholder = '0,00'
}: InputCurrencyProps) {
  const isEmpty = value === undefined || value === null || String(value).trim() === ''

  return (
    <div className={cn(
      error && 'relative top-4'
    )}>
      <CurrencyInput
        groupSeparator="."
        decimalSeparator=","
        decimalScale={2}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onValueChange={(value) => onChange(value)}
        className={cn(
          'w-full text-[32px] font-bold tracking-[-1px] outline-none placeholder:text-gray-400',
          isEmpty ? 'text-gray-500' : 'text-gray-800',
          error && 'text-red-900',
          className
        )}
      />

      {error && (
        <div className="mt-2 flex gap-2 items-center text-red-900">
          <CrossCircledIcon />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  )
}
