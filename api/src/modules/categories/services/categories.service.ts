import { Injectable } from '@nestjs/common'
import { CreateCategoryDto } from '../dto/create-category.dto'
import { UpdateCategoryDto } from '../dto/update-category.dto'
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto'
import { CreateCategoryUseCase } from '../use-cases/create-category.use-case'
import { FindAllCategoriesByUserUseCase } from '../use-cases/find-all-categories-by-user.use-case'
import { UpdateCategoryUseCase } from '../use-cases/update-category.use-case'
import { ReorderCategoriesUseCase } from '../use-cases/reorder-categories.use-case'
import { RemoveCategoryUseCase } from '../use-cases/remove-category.use-case'

@Injectable()
export class CategoriesService {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly findAllCategoriesByUserUseCase: FindAllCategoriesByUserUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly reorderCategoriesUseCase: ReorderCategoriesUseCase,
    private readonly removeCategoryUseCase: RemoveCategoryUseCase,
  ) {}

  create(userId: string, createCategoryDto: CreateCategoryDto) {
    return this.createCategoryUseCase.execute(userId, createCategoryDto)
  }

  findAllByUserId(userId: string) {
    return this.findAllCategoriesByUserUseCase.execute(userId)
  }

  update(
    userId: string,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.updateCategoryUseCase.execute(userId, categoryId, updateCategoryDto)
  }

  reorder(userId: string, reorderCategoriesDto: ReorderCategoriesDto) {
    return this.reorderCategoriesUseCase.execute(userId, reorderCategoriesDto)
  }

  remove(userId: string, categoryId: string) {
    return this.removeCategoryUseCase.execute(userId, categoryId)
  }
}
