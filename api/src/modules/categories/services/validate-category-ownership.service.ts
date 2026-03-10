import { Injectable, NotFoundException } from '@nestjs/common'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'

@Injectable()
export class ValidateCategoryOwnershipService {
  constructor(private readonly categoriesDataRepository: CategoriesDataRepository) {}

  async validate(userId: string, categoryId: string) {
    const isOwner = await this.categoriesDataRepository.findByIdAndUserId(categoryId, userId)

    if (!isOwner) throw new NotFoundException('Category not found.')
  }
}
