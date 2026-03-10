import { Injectable } from '@nestjs/common'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { TransactionType } from 'src/modules/transactions/entities/Transaction'

@Injectable()
export class CategoriesDataRepository {
  constructor(private readonly categoriesRepo: CategoriesRepository) {}

  create(data: {
    userId: string
    icon: string
    name: string
    type: TransactionType
    sortOrder: number
  }) {
    return this.categoriesRepo.create({ data })
  }

  findAllByUserId(userId: string) {
    return this.categoriesRepo.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  findByIdAndUserId(categoryId: string, userId: string) {
    return this.categoriesRepo.findFirst({
      where: { id: categoryId, userId },
    })
  }

  findCategoryTypeByIdAndUserId(categoryId: string, userId: string) {
    return this.categoriesRepo.findFirst({
      where: { id: categoryId, userId },
      select: { type: true },
    })
  }

  updateById(
    categoryId: string,
    data: {
      icon?: string
      name?: string
      type?: TransactionType
      sortOrder?: number
    },
  ) {
    return this.categoriesRepo.update({
      where: { id: categoryId },
      data,
    })
  }

  removeById(categoryId: string) {
    return this.categoriesRepo.delete({
      where: { id: categoryId },
    })
  }

  findIdsByUserIdAndType(userId: string, type: TransactionType) {
    return this.categoriesRepo.findMany({
      where: { userId, type },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  findLastSortOrderByUserIdAndType(userId: string, type: TransactionType) {
    return this.categoriesRepo.findFirst({
      where: { userId, type },
      select: { sortOrder: true },
      orderBy: [{ sortOrder: 'desc' }],
    })
  }
}
