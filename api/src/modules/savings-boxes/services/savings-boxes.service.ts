import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  FriendshipStatus,
  SavingsBoxAlertType,
  SavingsBoxStatus,
  SavingsBoxTransactionType,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import { FriendshipsRepository } from 'src/shared/database/repositories/friendships.repository'
import { SavingsBoxAlertsRepository } from 'src/shared/database/repositories/savings-box-alerts.repository'
import { SavingsBoxCollaboratorsRepository } from 'src/shared/database/repositories/savings-box-collaborators.repository'
import { SavingsBoxesRepository } from 'src/shared/database/repositories/savings-boxes.repository'
import { SavingsBoxTransactionsRepository } from 'src/shared/database/repositories/savings-box-transactions.repository'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import { CreateSavingsBoxDto } from '../dto/create-savings-box.dto'
import { CreateSavingsBoxEntryDto } from '../dto/create-savings-box-entry.dto'
import { SetSavingsBoxGoalDto } from '../dto/set-savings-box-goal.dto'
import { SetSavingsBoxRecurrenceDto } from '../dto/set-savings-box-recurrence.dto'
import { SetSavingsBoxYieldDto } from '../dto/set-savings-box-yield.dto'
import { UpdateSavingsBoxDto } from '../dto/update-savings-box.dto'
import { SavingsBoxesMathService } from './savings-boxes-math.service'
import { SavingsBoxesAlertsService } from './savings-boxes-alerts.service'

@Injectable()
export class SavingsBoxesService {
  constructor(
    private readonly savingsBoxesRepo: SavingsBoxesRepository,
    private readonly savingsBoxTransactionsRepo: SavingsBoxTransactionsRepository,
    private readonly savingsBoxAlertsRepo: SavingsBoxAlertsRepository,
    private readonly savingsBoxCollaboratorsRepo: SavingsBoxCollaboratorsRepository,
    private readonly friendshipsRepo: FriendshipsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly savingsBoxesMathService: SavingsBoxesMathService,
    private readonly savingsBoxesAlertsService: SavingsBoxesAlertsService,
  ) {}

  async create(userId: string, createSavingsBoxDto: CreateSavingsBoxDto) {
    const initialBalance = Number((createSavingsBoxDto.initialBalance ?? 0).toFixed(2))

    const savingsBox = await this.savingsBoxesRepo.create({
      data: {
        userId,
        name: createSavingsBoxDto.name,
        description: createSavingsBoxDto.description,
        currentBalance: initialBalance,
        targetAmount: createSavingsBoxDto.targetAmount,
        targetDate: createSavingsBoxDto.targetDate
          ? new Date(createSavingsBoxDto.targetDate)
          : undefined,
        alertEnabled: createSavingsBoxDto.alertEnabled ?? true,
        recurrenceEnabled: createSavingsBoxDto.recurrenceEnabled ?? false,
        recurrenceDay: createSavingsBoxDto.recurrenceDay,
        recurrenceAmount: createSavingsBoxDto.recurrenceAmount,
        monthlyYieldRate: createSavingsBoxDto.monthlyYieldRate,
        yieldMode: createSavingsBoxDto.yieldMode,
      },
    })

    if (initialBalance > 0) {
      await this.savingsBoxTransactionsRepo.create({
        data: {
          userId,
          savingsBoxId: savingsBox.id,
          type: SavingsBoxTransactionType.DEPOSIT,
          amount: initialBalance,
          date: new Date(),
          description: 'Saldo inicial da caixinha',
          isAutomatic: true,
          idempotencyKey: `savings-box-initial-balance:${savingsBox.id}`,
        },
      })
    }

    return savingsBox
  }

  async findAllByUserId(userId: string) {
    const savingsBoxes = await this.savingsBoxesRepo.findMany({
      where: {
        OR: [
          { userId },
          {
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalBalance = savingsBoxes.reduce(
      (acc, savingsBox) => acc + savingsBox.currentBalance,
      0,
    )

    return {
      totalBalance,
      savingsBoxes: savingsBoxes.map((savingsBox) => ({
        ...savingsBox,
        isOwner: savingsBox.userId === userId,
        ownerName: savingsBox.user.name,
      })),
    }
  }

  async findOneByUserId(userId: string, savingsBoxId: string) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    const [transactions, alerts, progress, projection] = await Promise.all([
      this.savingsBoxTransactionsRepo.findMany({
        where: {
          savingsBoxId,
        },
        orderBy: {
          date: 'desc',
        },
        take: 20,
      }),
      this.savingsBoxAlertsRepo.findMany({
        where: {
          savingsBoxId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      this.savingsBoxesMathService.computeProgress(savingsBox),
      this.savingsBoxesMathService.computeProjection(savingsBox),
    ])

    return {
      ...savingsBox,
      isOwner: savingsBox.userId === userId,
      ownerName: savingsBox.user.name,
      collaborators: savingsBox.collaborators.map((collaborator) => ({
        userId: collaborator.user.id,
        name: collaborator.user.name,
        email: collaborator.user.email,
      })),
      progress,
      projection,
      transactions,
      alerts,
    }
  }

  async update(
    userId: string,
    savingsBoxId: string,
    updateSavingsBoxDto: UpdateSavingsBoxDto,
  ) {
    await this.getOwnedSavingsBox(userId, savingsBoxId)

    const updatedBox = await this.savingsBoxesRepo.update({
      where: { id: savingsBoxId },
      data: {
        name: updateSavingsBoxDto.name,
        description: updateSavingsBoxDto.description,
        targetAmount: updateSavingsBoxDto.targetAmount,
        targetDate: updateSavingsBoxDto.targetDate
          ? new Date(updateSavingsBoxDto.targetDate)
          : undefined,
        alertEnabled: updateSavingsBoxDto.alertEnabled,
      },
    })

    await this.savingsBoxesAlertsService.evaluateGoalAlerts(updatedBox)

    return updatedBox
  }

  async setGoal(
    userId: string,
    savingsBoxId: string,
    setSavingsBoxGoalDto: SetSavingsBoxGoalDto,
  ) {
    const savingsBox = await this.getOwnedSavingsBox(userId, savingsBoxId)

    const updatedBox = await this.savingsBoxesRepo.update({
      where: { id: savingsBox.id },
      data: {
        targetAmount: setSavingsBoxGoalDto.targetAmount,
        targetDate: setSavingsBoxGoalDto.targetDate
          ? new Date(setSavingsBoxGoalDto.targetDate)
          : null,
        alertEnabled: setSavingsBoxGoalDto.alertEnabled,
      },
    })

    await this.savingsBoxesAlertsService.evaluateGoalAlerts(updatedBox)

    return updatedBox
  }

  async getProgress(userId: string, savingsBoxId: string) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    return this.savingsBoxesMathService.computeProgress(savingsBox)
  }

  async setRecurrence(
    userId: string,
    savingsBoxId: string,
    setSavingsBoxRecurrenceDto: SetSavingsBoxRecurrenceDto,
  ) {
    await this.getOwnedSavingsBox(userId, savingsBoxId)

    const updatedBox = await this.savingsBoxesRepo.update({
      where: { id: savingsBoxId },
      data: {
        recurrenceEnabled: setSavingsBoxRecurrenceDto.recurrenceEnabled,
        recurrenceDay: setSavingsBoxRecurrenceDto.recurrenceDay,
        recurrenceAmount: setSavingsBoxRecurrenceDto.recurrenceAmount,
      },
    })

    return updatedBox
  }

  async runRecurrenceNow(userId: string, savingsBoxId: string) {
    const savingsBox = await this.getOwnedSavingsBox(userId, savingsBoxId)

    if (!savingsBox.recurrenceEnabled || !savingsBox.recurrenceAmount) {
      throw new BadRequestException('Configure a recorrência antes de executar.')
    }

    const now = new Date()
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const idempotencyKey = `recurrence:${savingsBox.id}:${monthKey}`
    const existingTransaction = await this.savingsBoxTransactionsRepo.findUnique({
      where: { idempotencyKey },
    })

    if (existingTransaction) {
      return {
        alreadyExecuted: true,
        transaction: existingTransaction,
      }
    }

    const transaction = await this.createTransactionAndUpdateBalance({
      userId,
      savingsBox,
      type: SavingsBoxTransactionType.DEPOSIT,
      amount: savingsBox.recurrenceAmount,
      date: now,
      description: 'Aporte recorrente automático',
      isAutomatic: true,
      idempotencyKey,
    })

    await this.savingsBoxesRepo.update({
      where: { id: savingsBox.id },
      data: {
        lastRecurrenceRunAt: now,
      },
    })

    await this.savingsBoxesAlertsService.createAlert({
      userId,
      savingsBoxId: savingsBox.id,
      type: SavingsBoxAlertType.RECURRING_EXECUTED,
      message: `Aporte recorrente de R$ ${savingsBox.recurrenceAmount.toFixed(2)} executado na caixinha ${savingsBox.name}.`,
      idempotencyKey: `savings-box-alert:recurrence:${savingsBox.id}:${monthKey}`,
    })

    return {
      alreadyExecuted: false,
      transaction,
    }
  }

  async setYield(
    userId: string,
    savingsBoxId: string,
    setSavingsBoxYieldDto: SetSavingsBoxYieldDto,
  ) {
    await this.getOwnedSavingsBox(userId, savingsBoxId)

    return this.savingsBoxesRepo.update({
      where: { id: savingsBoxId },
      data: {
        monthlyYieldRate: setSavingsBoxYieldDto.monthlyYieldRate,
        yieldMode: setSavingsBoxYieldDto.yieldMode,
      },
    })
  }

  async runMonthlyYield(
    userId: string,
    { year, month }: { year: number; month: number },
  ) {
    const savingsBoxes = await this.savingsBoxesRepo.findMany({
      where: {
        userId,
        status: SavingsBoxStatus.ACTIVE,
      },
    })

    const results: Array<{
      savingsBoxId: string;
      applied: boolean;
      amount: number;
      reason?: string;
    }> = []

    for (const savingsBox of savingsBoxes) {
      if (!savingsBox.monthlyYieldRate || !savingsBox.yieldMode) {
        results.push({
          savingsBoxId: savingsBox.id,
          applied: false,
          amount: 0,
          reason: 'YIELD_NOT_CONFIGURED',
        })
        continue
      }

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
      const idempotencyKey = `yield:${savingsBox.id}:${monthKey}`

      const existingTransaction = await this.savingsBoxTransactionsRepo.findUnique({
        where: { idempotencyKey },
      })

      if (existingTransaction) {
        results.push({
          savingsBoxId: savingsBox.id,
          applied: false,
          amount: existingTransaction.amount,
          reason: 'ALREADY_APPLIED',
        })
        continue
      }

      const yieldAmount = this.savingsBoxesMathService.computeYieldAmount(savingsBox)

      if (yieldAmount <= 0) {
        results.push({
          savingsBoxId: savingsBox.id,
          applied: false,
          amount: 0,
          reason: 'NO_YIELD_AMOUNT',
        })
        continue
      }

      const referenceDate = new Date(Date.UTC(year, month, 1))

      await this.createTransactionAndUpdateBalance({
        userId,
        savingsBox,
        type: SavingsBoxTransactionType.YIELD,
        amount: yieldAmount,
        date: referenceDate,
        description: 'Rendimento mensal automático',
        isAutomatic: true,
        idempotencyKey,
      })

      await this.savingsBoxesRepo.update({
        where: { id: savingsBox.id },
        data: {
          lastYieldAppliedAt: referenceDate,
        },
      })

      results.push({
        savingsBoxId: savingsBox.id,
        applied: true,
        amount: yieldAmount,
      })
    }

    return {
      year,
      month,
      results,
    }
  }

  async getProjection(userId: string, savingsBoxId: string) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    return this.savingsBoxesMathService.computeProjection(savingsBox)
  }

  async getAnnualPlanning(userId: string, year: number) {
    const savingsBoxes = await this.savingsBoxesRepo.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const planning = savingsBoxes.map((savingsBox) => {
      let projectedBalance = savingsBox.currentBalance

      const months = Array.from({ length: 12 }).map((_, monthIndex) => {
        const plannedContribution = savingsBox.recurrenceEnabled
          ? savingsBox.recurrenceAmount ?? 0
          : 0

        projectedBalance += plannedContribution

        const plannedYield = this.savingsBoxesMathService.computeProjectedMonthlyYield(
          savingsBox.yieldMode,
          savingsBox.monthlyYieldRate,
          projectedBalance,
        )

        projectedBalance += plannedYield

        return {
          month: monthIndex,
          plannedContribution,
          plannedYield,
          projectedBalance: Number(projectedBalance.toFixed(2)),
        }
      })

      return {
        savingsBoxId: savingsBox.id,
        name: savingsBox.name,
        targetAmount: savingsBox.targetAmount,
        targetDate: savingsBox.targetDate,
        currentBalance: savingsBox.currentBalance,
        projectedEndOfYearBalance: Number(projectedBalance.toFixed(2)),
        months,
      }
    })

    return {
      year,
      planning,
    }
  }

  async deposit(
    userId: string,
    savingsBoxId: string,
    createSavingsBoxEntryDto: CreateSavingsBoxEntryDto,
  ) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    const transaction = await this.createTransactionAndUpdateBalance({
      userId,
      savingsBox,
      type: SavingsBoxTransactionType.DEPOSIT,
      amount: createSavingsBoxEntryDto.amount,
      date: new Date(createSavingsBoxEntryDto.date),
      description: createSavingsBoxEntryDto.description,
      sourceBankAccountId: createSavingsBoxEntryDto.bankAccountId,
      isAutomatic: false,
    })

    const refreshedBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)
    await this.savingsBoxesAlertsService.evaluateGoalAlerts(refreshedBox)

    return transaction
  }

  async withdraw(
    userId: string,
    savingsBoxId: string,
    createSavingsBoxEntryDto: CreateSavingsBoxEntryDto,
  ) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    if (savingsBox.currentBalance < createSavingsBoxEntryDto.amount) {
      throw new BadRequestException('Saldo insuficiente na caixinha para resgate.')
    }

    return this.createTransactionAndUpdateBalance({
      userId,
      savingsBox,
      type: SavingsBoxTransactionType.WITHDRAW,
      amount: createSavingsBoxEntryDto.amount,
      date: new Date(createSavingsBoxEntryDto.date),
      description: createSavingsBoxEntryDto.description,
      destinationBankAccountId: createSavingsBoxEntryDto.bankAccountId,
      isAutomatic: false,
    })
  }

  async findTransactions(userId: string, savingsBoxId: string) {
    await this.getAccessibleSavingsBox(userId, savingsBoxId)

    return this.savingsBoxTransactionsRepo.findMany({
      where: {
        savingsBoxId,
      },
      orderBy: {
        date: 'desc',
      },
    })
  }

  async findAlerts(userId: string, savingsBoxId: string) {
    await this.getAccessibleSavingsBox(userId, savingsBoxId)

    return this.savingsBoxAlertsRepo.findMany({
      where: {
        savingsBoxId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async shareWithFriend(userId: string, savingsBoxId: string, friendUserId: string) {
    const savingsBox = await this.getOwnedSavingsBox(userId, savingsBoxId)

    if (savingsBox.userId === friendUserId) {
      throw new BadRequestException('Você já é o dono desta caixinha.')
    }

    const friendUser = await this.usersRepo.findUnique({
      where: { id: friendUserId },
      select: { id: true },
    })

    if (!friendUser) {
      throw new NotFoundException('Amigo não encontrado.')
    }

    const friendship = await this.friendshipsRepo.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: friendUserId },
          { requesterId: friendUserId, addresseeId: userId },
        ],
      },
    })

    if (!friendship) {
      throw new BadRequestException('Vocês precisam ser amigos para compartilhar caixinhas.')
    }

    const existingCollaboration = await this.savingsBoxCollaboratorsRepo.findFirst({
      where: {
        savingsBoxId,
        userId: friendUserId,
      },
    })

    if (existingCollaboration) {
      throw new ConflictException('Esta caixinha já está compartilhada com este amigo.')
    }

    return this.savingsBoxCollaboratorsRepo.create({
      data: {
        savingsBoxId,
        userId: friendUserId,
        invitedByUserId: userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  private async getOwnedSavingsBox(userId: string, savingsBoxId: string) {
    const savingsBox = await this.savingsBoxesRepo.findFirst({
      where: {
        id: savingsBoxId,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!savingsBox) {
      throw new NotFoundException('Caixinha não encontrada.')
    }

    return savingsBox
  }

  private async getAccessibleSavingsBox(userId: string, savingsBoxId: string) {
    const savingsBox = await this.savingsBoxesRepo.findFirst({
      where: {
        id: savingsBoxId,
        OR: [
          { userId },
          {
            collaborators: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!savingsBox) {
      throw new NotFoundException('Caixinha não encontrada.')
    }

    return savingsBox
  }

  private async createTransactionAndUpdateBalance(params: {
    userId: string;
    savingsBox: {
      id: string;
      currentBalance: number;
    };
    type: SavingsBoxTransactionType;
    amount: number;
    date: Date;
    description?: string;
    sourceBankAccountId?: string;
    destinationBankAccountId?: string;
    isAutomatic: boolean;
    idempotencyKey?: string;
  }) {
    const delta =
      params.type === SavingsBoxTransactionType.WITHDRAW
        ? -params.amount
        : params.amount

    const transaction = await this.savingsBoxTransactionsRepo.create({
      data: {
        userId: params.userId,
        savingsBoxId: params.savingsBox.id,
        type: params.type,
        amount: params.amount,
        date: params.date,
        description: params.description,
        sourceBankAccountId: params.sourceBankAccountId,
        destinationBankAccountId: params.destinationBankAccountId,
        isAutomatic: params.isAutomatic,
        idempotencyKey: params.idempotencyKey,
      },
    })

    await this.savingsBoxesRepo.update({
      where: {
        id: params.savingsBox.id,
      },
      data: {
        currentBalance: Number((params.savingsBox.currentBalance + delta).toFixed(2)),
      },
    })

    return transaction
  }

}
