import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class SavingsBoxTransactionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany(findManyDto: Prisma.SavingsBoxTransactionFindManyArgs) {
    return this.prismaService.savingsBoxTransaction.findMany(findManyDto)
  }

  create(createDto: Prisma.SavingsBoxTransactionCreateArgs) {
    return this.prismaService.savingsBoxTransaction.create(createDto)
  }

  findUnique(findUniqueDto: Prisma.SavingsBoxTransactionFindUniqueArgs) {
    return this.prismaService.savingsBoxTransaction.findUnique(findUniqueDto)
  }
}
