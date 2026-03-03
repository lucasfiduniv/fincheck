import { Swiper, SwiperSlide } from 'swiper/react'
import { Link } from 'react-router-dom'
import { PlusIcon } from '@radix-ui/react-icons'
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
  onCreateAccount(): void
  onCreateCreditCard(): void
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
  onCreateAccount,
  onCreateCreditCard,
}: AccountsAndCardsListProps) {
  return (
    <div className="h-full overflow-y-auto pr-1 space-y-4 lg:space-y-5">
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
        <div className="flex items-center justify-between mb-3" slot="container-start">
          <strong className="text-white tracking-[-1px] text-base lg:text-lg font-bold">
            Minhas contas
          </strong>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateAccount}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center justify-center"
              aria-label="Adicionar conta"
              title="Adicionar conta"
            >
              <PlusIcon className="w-4 h-4" />
            </button>

            <SliderNavigation
              isBeginning={sliderState.isBeginning}
              isEnd={sliderState.isEnd}
            />
          </div>
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <strong className="text-white tracking-[-1px] text-base lg:text-lg font-bold block">
            Meus cartões
          </strong>

          <button
            type="button"
            onClick={onCreateCreditCard}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors flex items-center justify-center"
            aria-label="Adicionar cartão"
            title="Adicionar cartão"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {creditCards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/25 p-4 text-sm text-white/80">
            Você ainda não tem cartões cadastrados.
          </div>
        )}

        {creditCards.length > 0 && (
          <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-2">
            {creditCards.map((creditCard) => (
              <div key={creditCard.id} className="min-w-[250px] sm:min-w-[280px] max-w-[320px] flex-1">
                <CreditCardCard
                  data={creditCard}
                  onClick={onOpenCreditCardSummary}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pb-1">
        <div className="flex items-center justify-between mb-3">
          <strong className="text-white tracking-[-1px] text-base lg:text-lg font-bold block">
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
          <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-2">
            {savingsBoxes.map((savingsBox) => (
              <div key={savingsBox.id} className="min-w-[250px] sm:min-w-[280px] max-w-[320px] flex-1">
                <SavingsBoxCard data={savingsBox} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}