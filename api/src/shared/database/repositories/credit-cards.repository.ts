import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CreditCardsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.CreditCardFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.CreditCardFindManyArgs>,
  ) {
    return this.prismaService.creditCard.findMany(findManyDto)
  }

  findFirst<T extends Prisma.CreditCardFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.CreditCardFindFirstArgs>,
  ) {
    return this.prismaService.creditCard.findFirst(findFirstDto)
  }

  create(createDto: Prisma.CreditCardCreateArgs) {
    return this.prismaService.creditCard.create(createDto)
  }

  update(updateDto: Prisma.CreditCardUpdateArgs) {
    return this.prismaService.creditCard.update(updateDto)
  }

  delete(deleteDto: Prisma.CreditCardDeleteArgs) {
    return this.prismaService.creditCard.delete(deleteDto)
  }
}
