import { Injectable } from '@nestjs/common'
import { type Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.TransactionFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.TransactionFindManyArgs>,
  ) {
    return this.prismaService.transaction.findMany(findManyDto)
  }

  findFirst<T extends Prisma.TransactionFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.TransactionFindFirstArgs>,
  ) {
    return this.prismaService.transaction.findFirst(findFirstDto)
  }

  create<T extends Prisma.TransactionCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.TransactionCreateArgs>,
  ) {
    return this.prismaService.transaction.create(createDto)
  }

  update<T extends Prisma.TransactionUpdateArgs>(
    updateDto: Prisma.SelectSubset<T, Prisma.TransactionUpdateArgs>,
  ) {
    return this.prismaService.transaction.update(updateDto)
  }

  updateMany(updateManyDto: Prisma.TransactionUpdateManyArgs) {
    return this.prismaService.transaction.updateMany(updateManyDto)
  }

  delete(deleteDto: Prisma.TransactionDeleteArgs) {
    return this.prismaService.transaction.delete(deleteDto)
  }
}
