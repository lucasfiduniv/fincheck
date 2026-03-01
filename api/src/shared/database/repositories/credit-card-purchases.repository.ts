import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CreditCardPurchasesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findFirst(findFirstDto: Prisma.CreditCardPurchaseFindFirstArgs) {
    return this.prismaService.creditCardPurchase.findFirst(findFirstDto)
  }

  create(createDto: Prisma.CreditCardPurchaseCreateArgs) {
    return this.prismaService.creditCardPurchase.create(createDto)
  }
}
