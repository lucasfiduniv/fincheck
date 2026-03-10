import { Injectable } from '@nestjs/common'
import { CreateCategoryDto } from '../dto/create-category.dto'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoriesDataRepository: CategoriesDataRepository) {}

  async execute(userId: string, createCategoryDto: CreateCategoryDto) {
    const { icon, name, type } = createCategoryDto

    const lastCategoryOfType = await this.categoriesDataRepository.findLastSortOrderByUserIdAndType(
      userId,
      type,
    )
    const sortOrder = lastCategoryOfType ? lastCategoryOfType.sortOrder + 1 : 0

    return this.categoriesDataRepository.create({
      userId,
      icon,
      name,
      type,
      sortOrder,
    })
  }
}
