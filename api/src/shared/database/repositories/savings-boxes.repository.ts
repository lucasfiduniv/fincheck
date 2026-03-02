import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class SavingsBoxesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany(findManyDto: Prisma.SavingsBoxFindManyArgs) {
    return this.prismaService.savingsBox.findMany(findManyDto)
  }

  findFirst(findFirstDto: Prisma.SavingsBoxFindFirstArgs) {
    return this.prismaService.savingsBox.findFirst(findFirstDto)
  }

  create(createDto: Prisma.SavingsBoxCreateArgs) {
    return this.prismaService.savingsBox.create(createDto)
  }

  update(updateDto: Prisma.SavingsBoxUpdateArgs) {
    return this.prismaService.savingsBox.update(updateDto)
  }
}
