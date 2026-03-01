import { Swiper, SwiperSlide } from 'swiper/react'
import { BankAccount } from '../../../../../app/entities/BankAccount'
import { CreditCard } from '../../../../../app/entities/CreditCard'
import { AccountCard } from './AccountCard'
import { CreditCardCard } from './CreditCardCard'
import { SliderNavigation } from './SliderNavigation'

interface AccountsAndCardsListProps {
  accounts: BankAccount[]
  creditCards: CreditCard[]
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
  sliderState,
  onSliderChange,
  slidesPerView,
  onOpenAccountSummary,
  onOpenCreditCardSummary,
}: AccountsAndCardsListProps) {
  return (
    <div className="space-y-6">
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
    </div>
  )
}