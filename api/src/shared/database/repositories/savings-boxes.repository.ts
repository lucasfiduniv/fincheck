import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class SavingsBoxesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.SavingsBoxFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.SavingsBoxFindManyArgs>,
  ) {
    return this.prismaService.savingsBox.findMany(findManyDto)
  }

  findFirst<T extends Prisma.SavingsBoxFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.SavingsBoxFindFirstArgs>,
  ) {
    return this.prismaService.savingsBox.findFirst(findFirstDto)
  }

  create<T extends Prisma.SavingsBoxCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.SavingsBoxCreateArgs>,
  ) {
    return this.prismaService.savingsBox.create(createDto)
  }

  update<T extends Prisma.SavingsBoxUpdateArgs>(
    updateDto: Prisma.SelectSubset<T, Prisma.SavingsBoxUpdateArgs>,
  ) {
    return this.prismaService.savingsBox.update(updateDto)
  }
}
