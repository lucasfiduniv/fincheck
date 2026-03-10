import { Injectable } from '@nestjs/common'
import { UpdateCategoryDto } from '../dto/update-category.dto'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'
import { ValidateCategoryOwnershipService } from '../services/validate-category-ownership.service'

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly categoriesDataRepository: CategoriesDataRepository,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  async execute(userId: string, categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId)

    const existingCategory = await this.categoriesDataRepository.findCategoryTypeByIdAndUserId(
      categoryId,
      userId,
    )

    const { icon, name, type } = updateCategoryDto
    const isTypeChanged = existingCategory && existingCategory.type !== type

    let sortOrder: number | undefined

    if (isTypeChanged) {
      const lastCategoryOfType = await this.categoriesDataRepository.findLastSortOrderByUserIdAndType(
        userId,
        type,
      )
      sortOrder = lastCategoryOfType ? lastCategoryOfType.sortOrder + 1 : 0
    }

    return this.categoriesDataRepository.updateById(categoryId, {
      icon,
      name,
      type,
      sortOrder,
    })
  }
}
