import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class SavingsBoxAlertsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany(findManyDto: Prisma.SavingsBoxAlertFindManyArgs) {
    return this.prismaService.savingsBoxAlert.findMany(findManyDto)
  }

  findUnique(findUniqueDto: Prisma.SavingsBoxAlertFindUniqueArgs) {
    return this.prismaService.savingsBoxAlert.findUnique(findUniqueDto)
  }

  create(createDto: Prisma.SavingsBoxAlertCreateArgs) {
    return this.prismaService.savingsBoxAlert.create(createDto)
  }

  update(updateDto: Prisma.SavingsBoxAlertUpdateArgs) {
    return this.prismaService.savingsBoxAlert.update(updateDto)
  }
}
