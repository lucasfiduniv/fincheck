import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class FuelTripSegmentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private get delegate() {
    return (this.prismaService as any).fuelTripSegment
  }

  findMany<T extends Prisma.FuelTripSegmentFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.FuelTripSegmentFindManyArgs>,
  ) {
    if (!this.delegate?.findMany) {
      return Promise.resolve([] as any)
    }

    return this.delegate.findMany(findManyDto)
  }

  deleteMany<T extends Prisma.FuelTripSegmentDeleteManyArgs>(
    deleteManyDto: Prisma.SelectSubset<T, Prisma.FuelTripSegmentDeleteManyArgs>,
  ) {
    if (!this.delegate?.deleteMany) {
      return Promise.resolve({ count: 0 } as any)
    }

    return this.delegate.deleteMany(deleteManyDto)
  }

  createMany<T extends Prisma.FuelTripSegmentCreateManyArgs>(
    createManyDto: Prisma.SelectSubset<T, Prisma.FuelTripSegmentCreateManyArgs>,
  ) {
    if (!this.delegate?.createMany) {
      return Promise.resolve({ count: 0 } as any)
    }

    return this.delegate.createMany(createManyDto)
  }
}
