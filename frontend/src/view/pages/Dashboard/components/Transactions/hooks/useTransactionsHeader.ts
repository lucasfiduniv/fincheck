import type { Swiper as SwiperType } from 'swiper'

interface TransactionsHeaderFilters {
  month: number
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
}

interface UseTransactionsHeaderParams {
  filters: TransactionsHeaderFilters
  handleChangeFilters: (field: 'type' | 'month') => (value: 'INCOME' | 'EXPENSE' | 'TRANSFER' | number | undefined) => void
}

export function useTransactionsHeader({
  filters,
  handleChangeFilters,
}: UseTransactionsHeaderParams) {
  const selectedType = filters.type === 'TRANSFER' ? undefined : filters.type

  function handleMonthSlideChange(swiper: SwiperType) {
    handleChangeFilters('month')(swiper.realIndex)
  }

  return {
    selectedType,
    handleMonthSlideChange,
  }
}
