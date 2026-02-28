import { Injectable } from '@nestjs/common'
import { type Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CategoryBudgetsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.CategoryBudgetFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.CategoryBudgetFindManyArgs>,
  ) {
    return this.prismaService.categoryBudget.findMany(findManyDto)
  }

  findFirst(findFirstDto: Prisma.CategoryBudgetFindFirstArgs) {
    return this.prismaService.categoryBudget.findFirst(findFirstDto)
  }

  create(createDto: Prisma.CategoryBudgetCreateArgs) {
    return this.prismaService.categoryBudget.create(createDto)
  }

  update(updateDto: Prisma.CategoryBudgetUpdateArgs) {
    return this.prismaService.categoryBudget.update(updateDto)
  }

  delete(deleteDto: Prisma.CategoryBudgetDeleteArgs) {
    return this.prismaService.categoryBudget.delete(deleteDto)
  }
}
