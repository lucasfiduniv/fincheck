import { Module } from '@nestjs/common'
import { CreditCardsController } from './credit-cards.controller'
import { CreditCardsService } from './services/credit-cards.service'
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module'
import { CategoriesModule } from '../categories/categories.module'

@Module({
  imports: [BankAccountsModule, CategoriesModule],
  controllers: [CreditCardsController],
  providers: [CreditCardsService],
})
export class CreditCardsModule {}
