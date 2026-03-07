import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class CreditCardInstallmentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.CreditCardInstallmentFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.CreditCardInstallmentFindManyArgs>,
  ) {
    return this.prismaService.creditCardInstallment.findMany(findManyDto)
  }

  createMany(createManyDto: Prisma.CreditCardInstallmentCreateManyArgs) {
    return this.prismaService.creditCardInstallment.createMany(createManyDto)
  }

  update(updateDto: Prisma.CreditCardInstallmentUpdateArgs) {
    return this.prismaService.creditCardInstallment.update(updateDto)
  }

  updateMany(updateManyDto: Prisma.CreditCardInstallmentUpdateManyArgs) {
    return this.prismaService.creditCardInstallment.updateMany(updateManyDto)
  }

  deleteMany(deleteManyDto: Prisma.CreditCardInstallmentDeleteManyArgs) {
    return this.prismaService.creditCardInstallment.deleteMany(deleteManyDto)
  }
}
