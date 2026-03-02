import { Injectable } from '@nestjs/common'
import { Prisma, NotificationEventStatus } from '@prisma/client'
import { PrismaService } from '../prisma.service'

@Injectable()
export class NotificationEventsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDto: Prisma.NotificationEventCreateArgs) {
    return this.prismaService.notificationEvent.create(createDto)
  }

  findUnique(findUniqueDto: Prisma.NotificationEventFindUniqueArgs) {
    return this.prismaService.notificationEvent.findUnique(findUniqueDto)
  }

  findMany(findManyDto: Prisma.NotificationEventFindManyArgs) {
    return this.prismaService.notificationEvent.findMany(findManyDto)
  }

  update(updateDto: Prisma.NotificationEventUpdateArgs) {
    return this.prismaService.notificationEvent.update(updateDto)
  }

  async createPendingEvent(data: {
    userId: string;
    type: Prisma.NotificationEventCreateInput['type'];
    idempotencyKey: string;
    destination: string;
    message: string;
  }) {
    try {
      return await this.create({
        data: {
          userId: data.userId,
          type: data.type,
          idempotencyKey: data.idempotencyKey,
          destination: data.destination,
          message: data.message,
          status: NotificationEventStatus.PENDING,
        },
      })
    } catch {
      return this.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      })
    }
  }
}
