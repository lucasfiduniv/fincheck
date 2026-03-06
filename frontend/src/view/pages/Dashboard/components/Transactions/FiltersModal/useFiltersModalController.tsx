import { useEffect, useState } from 'react'
import { useBankAccounts } from '../../../../../../app/hooks/useBankAccounts'

interface UseFiltersModalControllerParams {
  open: boolean
  currentFilters: {
    bankAccountId?: string
    month: number
    year: number
  }
}

export function useFiltersModalController({
  open,
  currentFilters,
}: UseFiltersModalControllerParams) {
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<undefined | string>(undefined)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const { accounts } = useBankAccounts()

  useEffect(() => {
    if (!open) {
      return
    }

    setSelectedBankAccountId(currentFilters.bankAccountId)
    setSelectedYear(currentFilters.year)
    setSelectedMonth(currentFilters.month)
  }, [open, currentFilters.bankAccountId, currentFilters.year, currentFilters.month])

  function handleSelectBankAccount(bankAccountId: string) {
    setSelectedBankAccountId(prevState => prevState === bankAccountId ? undefined : bankAccountId)
  }

  function handleChangeYear(step: number) {
    setSelectedYear(prevState => prevState + step)
  }

  function handleChangeMonth(step: number) {
    setSelectedMonth((prevMonth) => {
      const nextMonth = prevMonth + step

      if (nextMonth < 0) {
        setSelectedYear((prevYear) => prevYear - 1)
        return 11
      }

      if (nextMonth > 11) {
        setSelectedYear((prevYear) => prevYear + 1)
        return 0
      }

      return nextMonth
    })
  }

  return {
    handleSelectBankAccount,
    selectedBankAccountId,
    selectedMonth,
    handleChangeMonth,
    selectedYear,
    handleChangeYear,
    accounts
  }
}
