import { Injectable } from '@nestjs/common'
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'

@Injectable()
export class ReorderCategoriesUseCase {
  constructor(private readonly categoriesDataRepository: CategoriesDataRepository) {}

  async execute(userId: string, reorderCategoriesDto: ReorderCategoriesDto) {
    const { orderedCategoryIds, type } = reorderCategoriesDto

    const categoriesOfType = await this.categoriesDataRepository.findIdsByUserIdAndType(userId, type)

    if (categoriesOfType.length === 0) {
      return { reorderedCount: 0 }
    }

    const existingIds = categoriesOfType.map((category) => category.id)
    const existingIdsSet = new Set(existingIds)

    const validRequestedIds: string[] = []
    const seenRequestedIds = new Set<string>()

    for (const categoryId of orderedCategoryIds) {
      if (!existingIdsSet.has(categoryId) || seenRequestedIds.has(categoryId)) {
        continue
      }

      validRequestedIds.push(categoryId)
      seenRequestedIds.add(categoryId)
    }

    const placedIdsSet = new Set(validRequestedIds)
    const remainingIds = existingIds.filter((id) => !placedIdsSet.has(id))
    const finalOrderedIds = [...validRequestedIds, ...remainingIds]

    await Promise.all(
      finalOrderedIds.map((categoryId, index) =>
        this.categoriesDataRepository.updateById(categoryId, {
          sortOrder: index,
        }),
      ),
    )

    return { reorderedCount: finalOrderedIds.length }
  }
}
