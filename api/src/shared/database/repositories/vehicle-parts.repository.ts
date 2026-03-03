import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class VehiclePartsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.VehiclePartFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.VehiclePartFindManyArgs>,
  ) {
    return this.prismaService.vehiclePart.findMany(findManyDto)
  }

  create<T extends Prisma.VehiclePartCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.VehiclePartCreateArgs>,
  ) {
    return this.prismaService.vehiclePart.create(createDto)
  }
}
