import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CreditCardPurchasesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.CreditCardPurchaseFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.CreditCardPurchaseFindManyArgs>,
  ) {
    return this.prismaService.creditCardPurchase.findMany(findManyDto)
  }

  findFirst(findFirstDto: Prisma.CreditCardPurchaseFindFirstArgs) {
    return this.prismaService.creditCardPurchase.findFirst(findFirstDto)
  }

  groupByCategoryAmountSum(where: Prisma.CreditCardPurchaseWhereInput) {
    return this.prismaService.creditCardPurchase.groupBy({
      by: ['categoryId'],
      where,
      _sum: {
        amount: true,
      },
    })
  }

  create(createDto: Prisma.CreditCardPurchaseCreateArgs) {
    return this.prismaService.creditCardPurchase.create(createDto)
  }

  update(updateDto: Prisma.CreditCardPurchaseUpdateArgs) {
    return this.prismaService.creditCardPurchase.update(updateDto)
  }
}
