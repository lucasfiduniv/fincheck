import { Module } from '@nestjs/common'
import { CategoriesService } from './services/categories.service'
import { CategoriesController } from './categories.controller'
import { ValidateCategoryOwnershipService } from './services/validate-category-ownership.service'
import { CategoriesDataRepository } from './repositories/categories-data.repository'
import { CreateCategoryUseCase } from './use-cases/create-category.use-case'
import { FindAllCategoriesByUserUseCase } from './use-cases/find-all-categories-by-user.use-case'
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case'
import { ReorderCategoriesUseCase } from './use-cases/reorder-categories.use-case'
import { RemoveCategoryUseCase } from './use-cases/remove-category.use-case'

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesDataRepository,
    ValidateCategoryOwnershipService,
    CreateCategoryUseCase,
    FindAllCategoriesByUserUseCase,
    UpdateCategoryUseCase,
    ReorderCategoriesUseCase,
    RemoveCategoryUseCase,
  ],
  exports: [ValidateCategoryOwnershipService],
})
export class CategoriesModule {}
