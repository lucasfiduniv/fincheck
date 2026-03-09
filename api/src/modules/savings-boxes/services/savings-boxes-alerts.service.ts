import { Injectable } from '@nestjs/common'
import { SavingsBoxAlertStatus, SavingsBoxAlertType } from '@prisma/client'
import { NotificationsService } from 'src/modules/notifications/notifications.service'
import { SavingsBoxAlertsRepository } from 'src/shared/database/repositories/savings-box-alerts.repository'

@Injectable()
export class SavingsBoxesAlertsService {
  constructor(
    private readonly savingsBoxAlertsRepo: SavingsBoxAlertsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async evaluateGoalAlerts(savingsBox: {
    id: string
    userId: string
    name: string
    currentBalance: number
    targetAmount: number | null
    targetDate: Date | null
    alertEnabled: boolean
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

  async createAlert(params: {
    userId: string
    savingsBoxId: string
    type: SavingsBoxAlertType
    message: string
    idempotencyKey: string
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
