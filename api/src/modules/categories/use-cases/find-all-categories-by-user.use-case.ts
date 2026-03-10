import { Injectable } from '@nestjs/common'
import { CategoriesDataRepository } from '../repositories/categories-data.repository'

@Injectable()
export class FindAllCategoriesByUserUseCase {
  constructor(private readonly categoriesDataRepository: CategoriesDataRepository) {}

  execute(userId: string) {
    return this.categoriesDataRepository.findAllByUserId(userId)
  }
}
