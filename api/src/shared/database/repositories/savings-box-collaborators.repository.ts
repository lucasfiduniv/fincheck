import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class SavingsBoxCollaboratorsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.SavingsBoxCollaboratorFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.SavingsBoxCollaboratorFindManyArgs>,
  ) {
    return this.prismaService.savingsBoxCollaborator.findMany(findManyDto)
  }

  findFirst<T extends Prisma.SavingsBoxCollaboratorFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.SavingsBoxCollaboratorFindFirstArgs>,
  ) {
    return this.prismaService.savingsBoxCollaborator.findFirst(findFirstDto)
  }

  create<T extends Prisma.SavingsBoxCollaboratorCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.SavingsBoxCollaboratorCreateArgs>,
  ) {
    return this.prismaService.savingsBoxCollaborator.create(createDto)
  }
}
