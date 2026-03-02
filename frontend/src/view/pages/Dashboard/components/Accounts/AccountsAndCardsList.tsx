import { Swiper, SwiperSlide } from 'swiper/react'
import { Link } from 'react-router-dom'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard } from '../../../../../app/entities/CreditCard'
import { SavingsBox } from '../../../../../app/entities/SavingsBox'
import { AccountCard } from './AccountCard'
import { CreditCardCard } from './CreditCardCard'
import { SavingsBoxCard } from './SavingsBoxCard'
import { SliderNavigation } from './SliderNavigation'

interface AccountsAndCardsListProps {
  accounts: BankAccount[]
  creditCards: CreditCard[]
  savingsBoxes: SavingsBox[]
  sliderState: {
    isBeginning: boolean
    isEnd: boolean
  }
  onSliderChange(sliderState: { isBeginning: boolean; isEnd: boolean }): void
  slidesPerView: number
  onOpenAccountSummary(account: BankAccount): void
  onOpenCreditCardSummary(creditCard: CreditCard): void
}

export function AccountsAndCardsList({
  accounts,
  creditCards,
  savingsBoxes,
  sliderState,
  onSliderChange,
  slidesPerView,
  onOpenAccountSummary,
  onOpenCreditCardSummary,
}: AccountsAndCardsListProps) {
  return (
    <div className="h-full overflow-y-auto pr-1 space-y-5">
      <Swiper
        spaceBetween={16}
        slidesPerView={slidesPerView}
        onSlideChange={swiper => {
          onSliderChange({
            isBeginning: swiper.isBeginning,
            isEnd: swiper.isEnd,
          })
        }}
      >
        <div className="flex items-center justify-between mb-4" slot="container-start">
          <strong className="text-white tracking-[-1px] text-lg font-bold">
            Minhas contas
          </strong>

          <SliderNavigation
            isBeginning={sliderState.isBeginning}
            isEnd={sliderState.isEnd}
          />
        </div>

        {accounts.map(account => (
          <SwiperSlide key={account.id}>
            <AccountCard data={account} onClick={onOpenAccountSummary} />
          </SwiperSlide>
        ))}

        {accounts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/25 p-4 text-sm text-white/80 mb-2" slot="container-end">
            Você ainda não tem contas bancárias.
          </div>
        )}
      </Swiper>

      {creditCards.length > 0 && (
        <div>
          <strong className="text-white tracking-[-1px] text-lg font-bold block mb-3">
            Meus cartões
          </strong>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {creditCards.map((creditCard) => (
              <div key={creditCard.id} className="min-w-[280px] max-w-[320px] flex-1">
                <CreditCardCard
                  data={creditCard}
                  onClick={onOpenCreditCardSummary}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pb-1">
        <div className="flex items-center justify-between mb-3">
          <strong className="text-white tracking-[-1px] text-lg font-bold block">
            Minhas caixinhas
          </strong>

          <Link
            to="/savings-boxes"
            className="text-xs text-white/80 hover:text-white transition-colors"
          >
            Ver todas
          </Link>
        </div>

        {savingsBoxes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/25 p-4 text-sm text-white/80">
            Você ainda não tem caixinhas. Crie sua primeira para começar a guardar.
          </div>
        )}

        {savingsBoxes.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {savingsBoxes.map((savingsBox) => (
              <div key={savingsBox.id} className="min-w-[280px] max-w-[320px] flex-1">
                <SavingsBoxCard data={savingsBox} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}