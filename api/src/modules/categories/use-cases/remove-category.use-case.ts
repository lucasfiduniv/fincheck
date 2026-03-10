import { Injectable } from '@nestjs/common'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'
import { ValidateCategoryOwnershipService } from '../services/validate-category-ownership.service'

@Injectable()
export class RemoveCategoryUseCase {
  constructor(
    private readonly categoriesDataRepository: CategoriesDataRepository,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  async execute(userId: string, categoryId: string) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId)

    await this.categoriesDataRepository.removeById(categoryId)

    return null
  }
}
