import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CreditCardPurchasesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDto: Prisma.CreditCardPurchaseCreateArgs) {
    return this.prismaService.creditCardPurchase.create(createDto)
  }
}
