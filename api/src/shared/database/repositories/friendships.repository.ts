import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class FriendshipsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findMany<T extends Prisma.FriendshipFindManyArgs>(
    findManyDto: Prisma.SelectSubset<T, Prisma.FriendshipFindManyArgs>,
  ) {
    return this.prismaService.friendship.findMany(findManyDto)
  }

  findFirst<T extends Prisma.FriendshipFindFirstArgs>(
    findFirstDto: Prisma.SelectSubset<T, Prisma.FriendshipFindFirstArgs>,
  ) {
    return this.prismaService.friendship.findFirst(findFirstDto)
  }

  create<T extends Prisma.FriendshipCreateArgs>(
    createDto: Prisma.SelectSubset<T, Prisma.FriendshipCreateArgs>,
  ) {
    return this.prismaService.friendship.create(createDto)
  }

  update<T extends Prisma.FriendshipUpdateArgs>(
    updateDto: Prisma.SelectSubset<T, Prisma.FriendshipUpdateArgs>,
  ) {
    return this.prismaService.friendship.update(updateDto)
  }
}
