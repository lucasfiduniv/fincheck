import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class FuelRecordsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.FuelRecordFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.FuelRecordFindManyArgs>,
  ) {
    return this.prismaService.fuelRecord.findMany(findManyDto)
  }

  findFirst<T extends Prisma.FuelRecordFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.FuelRecordFindFirstArgs>,
  ) {
    return this.prismaService.fuelRecord.findFirst(findFirstDto)
  }

  create<T extends Prisma.FuelRecordCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.FuelRecordCreateArgs>,
  ) {
    return this.prismaService.fuelRecord.create(createDto)
  }
}
