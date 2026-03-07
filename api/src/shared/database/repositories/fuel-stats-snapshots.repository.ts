import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class FuelStatsSnapshotsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private get delegate() {
    return (this.prismaService as any).fuelStatsSnapshot
  }

  findFirst<T extends Prisma.FuelStatsSnapshotFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.FuelStatsSnapshotFindFirstArgs>,
  ) {
    if (!this.delegate?.findFirst) {
      return Promise.resolve(null as any)
    }

    return this.delegate.findFirst(findFirstDto)
  }

  upsert<T extends Prisma.FuelStatsSnapshotUpsertArgs>(
    upsertDto: Prisma.SelectSubset<T, Prisma.FuelStatsSnapshotUpsertArgs>,
  ) {
    if (!this.delegate?.upsert) {
      return Promise.resolve(null as any)
    }

    return this.delegate.upsert(upsertDto)
  }
}
