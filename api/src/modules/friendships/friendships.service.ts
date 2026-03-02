import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { FriendshipStatus } from '@prisma/client'
import { FriendshipsRepository } from 'src/shared/database/repositories/friendships.repository'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly friendshipsRepo: FriendshipsRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  async sendRequest(userId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase()

    const friendUser = await this.usersRepo.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    })

    if (!friendUser) {
      throw new NotFoundException('Usuário não encontrado com este e-mail.')
    }

    if (friendUser.id === userId) {
      throw new BadRequestException('Você não pode adicionar a si mesmo como amigo.')
    }

    const existingRelation = await this.friendshipsRepo.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendUser.id },
          { requesterId: friendUser.id, addresseeId: userId },
        ],
      },
    })

    if (existingRelation?.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictException('Vocês já são amigos.')
    }

    if (existingRelation?.status === FriendshipStatus.PENDING) {
      throw new ConflictException('Já existe uma solicitação de amizade pendente.')
    }

    return this.friendshipsRepo.create({
      data: {
        requesterId: userId,
        addresseeId: friendUser.id,
        status: FriendshipStatus.PENDING,
      },
    })
  }

  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.friendshipsRepo.findFirst({
      where: {
        id: friendshipId,
        addresseeId: userId,
      },
    })

    if (!friendship) {
      throw new NotFoundException('Solicitação de amizade não encontrada.')
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Esta solicitação não está pendente.')
    }

    return this.friendshipsRepo.update({
      where: { id: friendship.id },
      data: { status: FriendshipStatus.ACCEPTED },
    })
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipsRepo.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        addressee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return friendships.map((friendship) => {
      const friend = friendship.requesterId === userId
        ? friendship.addressee
        : friendship.requester

      return {
        friendshipId: friendship.id,
        userId: friend.id,
        name: friend.name,
        email: friend.email,
        since: friendship.updatedAt,
      }
    })
  }

  async getReceivedRequests(userId: string) {
    return this.friendshipsRepo.findMany({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
