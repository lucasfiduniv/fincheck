import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { CategoryBudgetsRepository } from 'src/shared/database/repositories/category-budgets.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { CreateCategoryBudgetDto } from '../dto/create-category-budget.dto'
import { UpdateCategoryBudgetDto } from '../dto/update-category-budget.dto'

@Injectable()
export class CategoryBudgetsService {
  constructor(
    private readonly categoryBudgetsRepo: CategoryBudgetsRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly transactionsRepo: TransactionsRepository,
  ) {}

  async create(userId: string, createCategoryBudgetDto: CreateCategoryBudgetDto) {
    const { categoryId, limit, month, year } = createCategoryBudgetDto

    await this.validateExpenseCategoryOwnership(userId, categoryId)

    const budgetAlreadyExists = await this.categoryBudgetsRepo.findFirst({
      where: {
        userId,
        categoryId,
        month,
        year,
      },
    })

    if (budgetAlreadyExists) {
      throw new ConflictException('Budget for this category and month already exists.')
    }

    return this.categoryBudgetsRepo.create({
      data: {
        userId,
        categoryId,
        month,
        year,
        limit,
      },
    })
  }

  async findSummaryByMonth(
    userId: string,
    { month, year }: { month: number; year: number },
  ) {
    const [expenseCategories, budgets] = await Promise.all([
      this.categoriesRepo.findMany({
        where: {
          userId,
          type: 'EXPENSE',
        },
      }),
      this.categoryBudgetsRepo.findMany({
        where: {
          userId,
          month,
          year,
        },
      }),
    ])

    const budgetByCategory = new Map(
      budgets.map((budget) => [budget.categoryId, budget]),
    )

    const transactions = await this.transactionsRepo.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: {
          in: expenseCategories.map((category) => category.id),
        },
        date: {
          gte: new Date(Date.UTC(year, month)),
          lt: new Date(Date.UTC(year, month + 1)),
        },
      },
      select: {
        categoryId: true,
        value: true,
      },
    })

    const spentByCategory = transactions.reduce(
      (acc, transaction) => {
        const key = transaction.categoryId

        if (!key) return acc

        acc[key] = (acc[key] ?? 0) + transaction.value

        return acc
      },
      {} as Record<string, number>,
    )

    return expenseCategories.map((category) => {
      const budget = budgetByCategory.get(category.id)
      const spent = spentByCategory[category.id] ?? 0

      if (!budget) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          categoryIcon: category.icon,
          categoryBudgetId: null,
          limit: null,
          spent,
          remaining: null,
          percentageUsed: null,
          status: 'NO_BUDGET',
          hasAlert: false,
        }
      }

      const percentageUsed = budget.limit > 0
        ? Number(((spent / budget.limit) * 100).toFixed(2))
        : 0

      const remaining = Number((budget.limit - spent).toFixed(2))

      const status =
        percentageUsed >= 100
          ? 'OVER'
          : percentageUsed >= 80
            ? 'WARNING'
            : 'SAFE'

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryBudgetId: budget.id,
        limit: budget.limit,
        spent,
        remaining,
        percentageUsed,
        status,
        hasAlert: status === 'WARNING' || status === 'OVER',
      }
    })
  }

  async update(
    userId: string,
    categoryBudgetId: string,
    updateCategoryBudgetDto: UpdateCategoryBudgetDto,
  ) {
    await this.validateCategoryBudgetOwnership(userId, categoryBudgetId)

    const { limit } = updateCategoryBudgetDto

    return this.categoryBudgetsRepo.update({
      where: { id: categoryBudgetId },
      data: { limit },
    })
  }

  async remove(userId: string, categoryBudgetId: string) {
    await this.validateCategoryBudgetOwnership(userId, categoryBudgetId)

    await this.categoryBudgetsRepo.delete({
      where: { id: categoryBudgetId },
    })

    return null
  }

  private async validateExpenseCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.categoriesRepo.findFirst({
      where: {
        id: categoryId,
        userId,
        type: 'EXPENSE',
      },
    })

    if (!category) {
      throw new NotFoundException('Expense category not found.')
    }
  }

  private async validateCategoryBudgetOwnership(
    userId: string,
    categoryBudgetId: string,
  ) {
    const isOwner = await this.categoryBudgetsRepo.findFirst({
      where: {
        id: categoryBudgetId,
        userId,
      },
    })

    if (!isOwner) {
      throw new NotFoundException('Category budget not found.')
    }
  }
}
