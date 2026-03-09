import { Injectable } from '@nestjs/common'
import { CreateCategoryDto } from '../dto/create-category.dto'
import { UpdateCategoryDto } from '../dto/update-category.dto'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { ValidateCategoryOwnershipService } from './validate-category-ownership.service'
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto'
import { TransactionType } from 'src/modules/transactions/entities/Transaction'

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepo: CategoriesRepository,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    const { icon, name, type } = createCategoryDto
    const nextSortOrder = await this.getNextSortOrder(userId, type)

    return this.categoriesRepo.create({
      data: {
        userId,
        icon,
        name,
        type,
        sortOrder: nextSortOrder,
      },
    })
  }

  findAllByUserId(userId: string) {
    return this.categoriesRepo.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async update(
    userId: string,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId)

    const existingCategory = await this.categoriesRepo.findFirst({
      where: { id: categoryId, userId },
      select: { type: true },
    })

    const { icon, name, type } = updateCategoryDto
    const isTypeChanged = existingCategory && existingCategory.type !== type
    const nextSortOrder = isTypeChanged
      ? await this.getNextSortOrder(userId, type)
      : undefined

    return this.categoriesRepo.update({
      where: { id: categoryId },
      data: {
        icon,
        name,
        type,
        sortOrder: nextSortOrder,
      },
    })
  }

  async reorder(userId: string, reorderCategoriesDto: ReorderCategoriesDto) {
    const { orderedCategoryIds, type } = reorderCategoriesDto

    const categoriesOfType = await this.categoriesRepo.findMany({
      where: {
        userId,
        type,
      },
      select: {
        id: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    if (categoriesOfType.length === 0) {
      return { reorderedCount: 0 }
    }

    const availableIds = new Set(categoriesOfType.map((category) => category.id))
    const validRequestedIds = orderedCategoryIds.filter((id) => availableIds.has(id))

    const remainingIds = categoriesOfType
      .map((category) => category.id)
      .filter((id) => !validRequestedIds.includes(id))

    const finalOrderedIds = [...validRequestedIds, ...remainingIds]

    await Promise.all(
      finalOrderedIds.map((categoryId, index) => this.categoriesRepo.update({
        where: { id: categoryId },
        data: {
          sortOrder: index,
        },
      })),
    )

    return { reorderedCount: finalOrderedIds.length }
  }

  async remove(userId: string, categoryId: string) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId)

    await this.categoriesRepo.delete({
      where: { id: categoryId },
    })

    return null
  }

  private async getNextSortOrder(userId: string, type: TransactionType) {
    const lastCategoryOfType = await this.categoriesRepo.findFirst({
      where: {
        userId,
        type,
      },
      select: {
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'desc' }],
    })

    if (!lastCategoryOfType) {
      return 0
    }

    return lastCategoryOfType.sortOrder + 1
  }
}
