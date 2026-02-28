import { Module } from '@nestjs/common'
import { CategoryBudgetsService } from './services/category-budgets.service'
import { CategoryBudgetsController } from './category-budgets.controller'

@Module({
  controllers: [CategoryBudgetsController],
  providers: [CategoryBudgetsService],
})
export class CategoryBudgetsModule {}
