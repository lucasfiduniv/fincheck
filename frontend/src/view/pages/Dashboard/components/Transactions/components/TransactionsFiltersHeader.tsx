import { FilterIcon } from '../../../../../components/icons/FilterIcon'
import { Swiper, SwiperSlide } from 'swiper/react'
import { MONTHS } from '../../../../../../app/config/constants'
import { SliderNavigation } from '../SliderNavigation'
import { SliderOption } from '../SliderOption'
import { TransactionTypeDropdown } from '../TransactionTypeDropdown.tsx'
import { FiltersModal } from '../FiltersModal'
import { BudgetsModal } from '../../../modals/BudgetsModal'
import { useTransactionsHeader } from '../hooks/useTransactionsHeader'
import { CategoryBudgetSummary } from '../../../../../../app/entities/CategoryBudget'

interface TransactionsFiltersHeaderProps {
  isFiltersModalOpen: boolean
  onCloseFiltersModal: () => void
  onOpenFiltersModal: () => void
  onApplyFilters: (filters: { bankAccountId: string | undefined; month: number; year: number }) => void
  filters: {
    bankAccountId?: string
    month: number
    year: number
    type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  }
  handleChangeFilters: (field: 'type' | 'month') => (value: 'INCOME' | 'EXPENSE' | 'TRANSFER' | number | undefined) => void
  isBudgetsModalOpen: boolean
  onCloseBudgetsModal: () => void
  categoryBudgets: CategoryBudgetSummary[]
}

export function TransactionsFiltersHeader({
  isFiltersModalOpen,
  onCloseFiltersModal,
  onOpenFiltersModal,
  onApplyFilters,
  filters,
  handleChangeFilters,
  isBudgetsModalOpen,
  onCloseBudgetsModal,
  categoryBudgets,
}: TransactionsFiltersHeaderProps) {
  const {
    selectedType,
    handleMonthSlideChange,
  } = useTransactionsHeader({ filters, handleChangeFilters })

  return (
    <>
      <FiltersModal
        open={isFiltersModalOpen}
        currentFilters={filters}
        onApplyFilters={onApplyFilters}
        onClose={onCloseFiltersModal}
      />

      <BudgetsModal
        open={isBudgetsModalOpen}
        onClose={onCloseBudgetsModal}
        month={filters.month}
        year={filters.year}
        budgets={categoryBudgets}
      />

      <header>
        <div className="flex justify-between items-center">
          <TransactionTypeDropdown
            onSelect={handleChangeFilters('type')}
            selectedType={selectedType}
          />

          <button onClick={onOpenFiltersModal}>
            <FilterIcon />
          </button>
        </div>

        <div className="mt-6 relative">
          <Swiper
            slidesPerView={3}
            centeredSlides
            initialSlide={filters.month}
            onSlideChange={handleMonthSlideChange}
          >
            <SliderNavigation />
            {MONTHS.map((month, index) => (
              <SwiperSlide key={month}>
                {({ isActive }) => (
                  <SliderOption
                    index={index}
                    isActive={isActive}
                    month={month}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </header>
    </>
  )
}
