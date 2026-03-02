import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  FriendshipStatus,
  SavingsBoxAlertStatus,
  SavingsBoxAlertType,
  SavingsBoxStatus,
  SavingsBoxTransactionType,
  SavingsBoxYieldMode,
} from '@prisma/client'
import { randomUUID } from 'crypto'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
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

@Injectable()
export class SavingsBoxesService {
  constructor(
    private readonly savingsBoxesRepo: SavingsBoxesRepository,
    private readonly savingsBoxTransactionsRepo: SavingsBoxTransactionsRepository,
    private readonly savingsBoxAlertsRepo: SavingsBoxAlertsRepository,
    private readonly savingsBoxCollaboratorsRepo: SavingsBoxCollaboratorsRepository,
    private readonly friendshipsRepo: FriendshipsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly notificationsService: NotificationsService,
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
      this.computeProgress(savingsBox),
      this.computeProjection(savingsBox),
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

    await this.evaluateGoalAlerts(updatedBox)

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

    await this.evaluateGoalAlerts(updatedBox)

    return updatedBox
  }

  async getProgress(userId: string, savingsBoxId: string) {
    const savingsBox = await this.getAccessibleSavingsBox(userId, savingsBoxId)

    return this.computeProgress(savingsBox)
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

    await this.createAlert({
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

      const yieldAmount = this.computeYieldAmount(savingsBox)

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

    return this.computeProjection(savingsBox)
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

        const plannedYield = this.computeProjectedMonthlyYield(
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
    await this.evaluateGoalAlerts(refreshedBox)

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

  private async computeProgress(savingsBox: {
    currentBalance: number;
    targetAmount: number | null;
    targetDate: Date | null;
  }) {
    const targetAmount = savingsBox.targetAmount ?? 0
    const percentage =
      targetAmount > 0
        ? Number(((savingsBox.currentBalance / targetAmount) * 100).toFixed(2))
        : 0

    const remaining =
      targetAmount > 0
        ? Number((targetAmount - savingsBox.currentBalance).toFixed(2))
        : null

    const now = new Date()
    const daysToTarget = savingsBox.targetDate
      ? Math.ceil((savingsBox.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const monthlyRequired =
      remaining !== null && remaining > 0 && daysToTarget !== null && daysToTarget > 0
        ? Number((remaining / Math.max(1, daysToTarget / 30)).toFixed(2))
        : null

    return {
      targetAmount: savingsBox.targetAmount,
      targetDate: savingsBox.targetDate,
      currentBalance: savingsBox.currentBalance,
      percentage,
      remaining,
      daysToTarget,
      monthlyRequired,
      isCompleted: targetAmount > 0 && savingsBox.currentBalance >= targetAmount,
    }
  }

  private async computeProjection(savingsBox: {
    currentBalance: number;
    targetAmount: number | null;
    recurrenceEnabled: boolean;
    recurrenceAmount: number | null;
    monthlyYieldRate: number | null;
    yieldMode: SavingsBoxYieldMode | null;
  }) {
    const monthlyContribution = savingsBox.recurrenceEnabled
      ? (savingsBox.recurrenceAmount ?? 0)
      : 0

    let projectedBalance = savingsBox.currentBalance
    let estimatedMonthsToGoal: number | null = null

    if (savingsBox.targetAmount && savingsBox.targetAmount > projectedBalance) {
      let monthCounter = 0
      while (projectedBalance < savingsBox.targetAmount && monthCounter < 600) {
        projectedBalance += monthlyContribution
        projectedBalance += this.computeProjectedMonthlyYield(
          savingsBox.yieldMode,
          savingsBox.monthlyYieldRate,
          projectedBalance,
        )

        monthCounter += 1
      }

      estimatedMonthsToGoal = monthCounter < 600 ? monthCounter : null
    }

    const projectedBalanceIn12Months = this.projectBalanceInMonths(
      savingsBox.currentBalance,
      monthlyContribution,
      savingsBox.yieldMode,
      savingsBox.monthlyYieldRate,
      12,
    )

    return {
      monthlyContribution,
      projectedBalanceIn12Months,
      estimatedMonthsToGoal,
      estimatedGoalDate: estimatedMonthsToGoal !== null
        ? this.addMonths(new Date(), estimatedMonthsToGoal).toISOString()
        : null,
    }
  }

  private projectBalanceInMonths(
    currentBalance: number,
    monthlyContribution: number,
    yieldMode: SavingsBoxYieldMode | null,
    monthlyYieldRate: number | null,
    months: number,
  ) {
    let balance = currentBalance

    for (let index = 0; index < months; index += 1) {
      balance += monthlyContribution
      balance += this.computeProjectedMonthlyYield(yieldMode, monthlyYieldRate, balance)
    }

    return Number(balance.toFixed(2))
  }

  private computeProjectedMonthlyYield(
    yieldMode: SavingsBoxYieldMode | null,
    monthlyYieldRate: number | null,
    currentBalance: number,
  ) {
    if (!yieldMode || !monthlyYieldRate || monthlyYieldRate <= 0) {
      return 0
    }

    if (yieldMode === SavingsBoxYieldMode.FIXED) {
      return Number(monthlyYieldRate.toFixed(2))
    }

    return Number(((currentBalance * monthlyYieldRate) / 100).toFixed(2))
  }

  private computeYieldAmount(savingsBox: {
    currentBalance: number;
    monthlyYieldRate: number | null;
    yieldMode: SavingsBoxYieldMode | null;
  }) {
    if (!savingsBox.monthlyYieldRate || !savingsBox.yieldMode) {
      return 0
    }

    if (savingsBox.yieldMode === SavingsBoxYieldMode.FIXED) {
      return Number(savingsBox.monthlyYieldRate.toFixed(2))
    }

    return Number(((savingsBox.currentBalance * savingsBox.monthlyYieldRate) / 100).toFixed(2))
  }

  private addMonths(date: Date, months: number) {
    const clonedDate = new Date(date)

    clonedDate.setMonth(clonedDate.getMonth() + months)

    return clonedDate
  }

  private async evaluateGoalAlerts(savingsBox: {
    id: string;
    userId: string;
    name: string;
    currentBalance: number;
    targetAmount: number | null;
    targetDate: Date | null;
    alertEnabled: boolean;
  }) {
    if (!savingsBox.alertEnabled || !savingsBox.targetAmount) {
      return
    }

    if (savingsBox.currentBalance >= savingsBox.targetAmount) {
      const monthKey = new Date().toISOString().slice(0, 7)
      await this.createAlert({
        userId: savingsBox.userId,
        savingsBoxId: savingsBox.id,
        type: SavingsBoxAlertType.GOAL_COMPLETED,
        message: `🎯 Parabéns! Você concluiu a meta da caixinha ${savingsBox.name}.`,
        idempotencyKey: `savings-box-alert:goal-completed:${savingsBox.id}:${monthKey}`,
      })
      return
    }

    if (!savingsBox.targetDate) {
      return
    }

    const now = new Date()
    const daysToTarget = Math.ceil(
      (savingsBox.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    const progress = (savingsBox.currentBalance / savingsBox.targetAmount) * 100

    if (daysToTarget <= 15 && progress < 80) {
      await this.createAlert({
        userId: savingsBox.userId,
        savingsBoxId: savingsBox.id,
        type: SavingsBoxAlertType.GOAL_NEAR_DUE,
        message: `⚠️ A meta da caixinha ${savingsBox.name} vence em ${daysToTarget} dia(s) e está em ${progress.toFixed(0)}%.`,
        idempotencyKey: `savings-box-alert:goal-near-due:${savingsBox.id}:${savingsBox.targetDate.toISOString().slice(0, 10)}`,
      })
    }
  }

  private async createAlert(params: {
    userId: string;
    savingsBoxId: string;
    type: SavingsBoxAlertType;
    message: string;
    idempotencyKey: string;
  }) {
    const existingAlert = await this.savingsBoxAlertsRepo.findUnique({
      where: {
        idempotencyKey: params.idempotencyKey,
      },
    })

    if (existingAlert) {
      return existingAlert
    }

    const alert = await this.savingsBoxAlertsRepo.create({
      data: {
        userId: params.userId,
        savingsBoxId: params.savingsBoxId,
        type: params.type,
        message: params.message,
        idempotencyKey: params.idempotencyKey,
      },
    })

    try {
      await this.notificationsService.notifyUser(
        params.userId,
        params.message,
        'GENERAL',
        {
          idempotencyKey: `notification-event:${params.idempotencyKey}`,
        },
      )

      return this.savingsBoxAlertsRepo.update({
        where: { id: alert.id },
        data: {
          status: SavingsBoxAlertStatus.SENT,
          sentAt: new Date(),
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Falha ao enviar alerta da caixinha.'

      return this.savingsBoxAlertsRepo.update({
        where: { id: alert.id },
        data: {
          status: SavingsBoxAlertStatus.FAILED,
          errorMessage,
        },
      })
    }
  }
}
