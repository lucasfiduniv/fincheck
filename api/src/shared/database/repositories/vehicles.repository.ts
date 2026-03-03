import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.VehicleFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.VehicleFindManyArgs>,
  ) {
    return this.prismaService.vehicle.findMany(findManyDto)
  }

  findFirst<T extends Prisma.VehicleFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.VehicleFindFirstArgs>,
  ) {
    return this.prismaService.vehicle.findFirst(findFirstDto)
  }

  create<T extends Prisma.VehicleCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.VehicleCreateArgs>,
  ) {
    return this.prismaService.vehicle.create(createDto)
  }

  update<T extends Prisma.VehicleUpdateArgs>(
    updateDto: Prisma.SelectSubset<T, Prisma.VehicleUpdateArgs>,
  ) {
    return this.prismaService.vehicle.update(updateDto)
  }
}
