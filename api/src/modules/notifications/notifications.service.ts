import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import { env } from 'src/shared/config/env'
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto'
import {
  NotificationEventStatus,
  NotificationEventType,
} from '@prisma/client'
import { NotificationEventsRepository } from 'src/shared/database/repositories/notification-events.repository'
import { randomUUID } from 'crypto'

type NotificationPreferenceType = NotificationEventType

@Injectable()
export class NotificationsService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly notificationEventsRepo: NotificationEventsRepository,
  ) {}

  async getSettings(userId: string) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
        notifyDueReminders: true,
        notifyCreditCardDue: true,
        notifyBudgetAlerts: true,
        notifyLowBalance: true,
        notifyWeeklySummary: true,
      },
    })

    return {
      phoneNumber: user?.phoneNumber ?? null,
      notificationsEnabled: user?.notificationsEnabled ?? false,
      preferences: {
        dueReminders: user?.notifyDueReminders ?? true,
        creditCardDue: user?.notifyCreditCardDue ?? true,
        budgetAlerts: user?.notifyBudgetAlerts ?? true,
        lowBalance: user?.notifyLowBalance ?? false,
        weeklySummary: user?.notifyWeeklySummary ?? false,
      },
      hasEvolutionConfigured: Boolean(
        env.evolutionApiUrl && env.evolutionApiKey && env.evolutionInstance,
      ),
    }
  }

  async updateSettings(
    userId: string,
    updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ) {
    const currentSettings = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
      },
    })

    const normalizedPhone =
      typeof updateNotificationSettingsDto.phoneNumber === 'string'
        ? this.normalizePhone(updateNotificationSettingsDto.phoneNumber)
        : undefined

    const nextPhone = normalizedPhone ?? currentSettings?.phoneNumber
    const nextNotificationsEnabled =
      updateNotificationSettingsDto.notificationsEnabled
      ?? currentSettings?.notificationsEnabled
      ?? false

    if (
      nextNotificationsEnabled
      && !nextPhone
    ) {
      throw new BadRequestException('Informe um telefone para habilitar notificações.')
    }

    if (
      nextNotificationsEnabled
      && nextPhone
      && !this.isPhoneFormatSupported(nextPhone)
    ) {
      throw new BadRequestException('Telefone inválido. Use DDI + DDD + número (ex.: 5542991317112).')
    }

    const user = await this.usersRepo.update({
      where: { id: userId },
      data: {
        phoneNumber: normalizedPhone,
        notificationsEnabled: updateNotificationSettingsDto.notificationsEnabled,
        notifyDueReminders: updateNotificationSettingsDto.preferences?.dueReminders,
        notifyCreditCardDue: updateNotificationSettingsDto.preferences?.creditCardDue,
        notifyBudgetAlerts: updateNotificationSettingsDto.preferences?.budgetAlerts,
        notifyLowBalance: updateNotificationSettingsDto.preferences?.lowBalance,
        notifyWeeklySummary: updateNotificationSettingsDto.preferences?.weeklySummary,
      },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
        notifyDueReminders: true,
        notifyCreditCardDue: true,
        notifyBudgetAlerts: true,
        notifyLowBalance: true,
        notifyWeeklySummary: true,
      },
    })

    return {
      phoneNumber: user.phoneNumber,
      notificationsEnabled: user.notificationsEnabled,
      preferences: {
        dueReminders: user.notifyDueReminders,
        creditCardDue: user.notifyCreditCardDue,
        budgetAlerts: user.notifyBudgetAlerts,
        lowBalance: user.notifyLowBalance,
        weeklySummary: user.notifyWeeklySummary,
      },
    }
  }

  async getHistory(userId: string, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100)

    const history = await this.notificationEventsRepo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        destination: true,
        message: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true,
      },
    })

    return history
  }

  async sendTestNotification(userId: string, customMessage?: string) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phoneNumber: true,
        notificationsEnabled: true,
      },
    })

    const number = user?.phoneNumber

    if (!number) {
      throw new BadRequestException('Cadastre um telefone para enviar notificações de teste.')
    }

    if (!user?.notificationsEnabled) {
      throw new BadRequestException('Ative as notificações para enviar teste.')
    }

    const message =
      customMessage?.trim()
      || `🔔 Fincheck: teste de notificação concluído com sucesso, ${user?.name ?? ''}!`

    await this.dispatchWhatsappNotification({
      userId,
      type: NotificationEventType.GENERAL,
      phoneNumber: number,
      message,
      idempotencyKey: `test:${userId}:${randomUUID()}`,
    })
  }

  async notifyUser(
    userId: string,
    message: string,
    type: NotificationPreferenceType = 'GENERAL',
    options?: {
      idempotencyKey?: string;
    },
  ) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
        notifyDueReminders: true,
        notifyCreditCardDue: true,
        notifyBudgetAlerts: true,
        notifyLowBalance: true,
        notifyWeeklySummary: true,
      },
    })

    if (!user?.notificationsEnabled || !user.phoneNumber) {
      return
    }

    if (!this.isNotificationTypeEnabled(user, type)) {
      return
    }

    await this.dispatchWhatsappNotification({
      userId,
      type,
      phoneNumber: user.phoneNumber,
      message,
      idempotencyKey: options?.idempotencyKey,
    })
  }

  private async dispatchWhatsappNotification(params: {
    userId: string;
    type: NotificationEventType;
    phoneNumber: string;
    message: string;
    idempotencyKey?: string;
  }) {
    const normalizedDestination = this.normalizePhone(params.phoneNumber)

    if (!normalizedDestination || !this.isPhoneFormatSupported(normalizedDestination)) {
      throw new BadRequestException('Telefone inválido para envio de notificação.')
    }

    const idempotencyKey = params.idempotencyKey ?? `auto:${randomUUID()}`

    const existingEvent = await this.notificationEventsRepo.findUnique({
      where: { idempotencyKey },
    })

    if (existingEvent) {
      return existingEvent
    }

    const event = await this.notificationEventsRepo.createPendingEvent({
      userId: params.userId,
      type: params.type,
      idempotencyKey,
      destination: normalizedDestination,
      message: params.message,
    })

    if (!event) {
      throw new ServiceUnavailableException('Falha ao registrar evento de notificação.')
    }

    if (event.status !== NotificationEventStatus.PENDING) {
      return event
    }

    try {
      const providerResponse = await this.sendTextMessage(
        normalizedDestination,
        params.message,
      )

      return this.notificationEventsRepo.update({
        where: { id: event.id },
        data: {
          status: NotificationEventStatus.SENT,
          sentAt: new Date(),
          providerResponse,
          errorMessage: null,
        },
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Falha desconhecida ao enviar notificação.'

      await this.notificationEventsRepo.update({
        where: { id: event.id },
        data: {
          status: NotificationEventStatus.FAILED,
          errorMessage,
        },
      })

      throw error
    }
  }

  private isNotificationTypeEnabled(
    user: {
      notifyDueReminders: boolean;
      notifyCreditCardDue: boolean;
      notifyBudgetAlerts: boolean;
      notifyLowBalance: boolean;
      notifyWeeklySummary: boolean;
    },
    type: NotificationPreferenceType,
  ) {
    if (type === 'DUE_REMINDERS') {
      return user.notifyDueReminders
    }

    if (type === 'CREDIT_CARD_DUE') {
      return user.notifyCreditCardDue
    }

    if (type === 'BUDGET_ALERTS') {
      return user.notifyBudgetAlerts
    }

    if (type === 'LOW_BALANCE') {
      return user.notifyLowBalance
    }

    if (type === 'WEEKLY_SUMMARY') {
      return user.notifyWeeklySummary
    }

    return true
  }

  private normalizePhone(phoneNumber: string) {
    const digits = phoneNumber.replace(/\D/g, '')

    if (!digits) {
      return null
    }

    if (digits.startsWith('55')) {
      return digits
    }

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`
    }

    return digits
  }

  private isPhoneFormatSupported(phoneNumber: string) {
    return /^55\d{10,11}$/.test(phoneNumber)
  }

  private async sendTextMessage(number: string, text: string) {
    if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
      throw new ServiceUnavailableException('Evolution API não configurada no servidor.')
    }

    const response = await fetch(
      `${env.evolutionApiUrl}/message/sendText/${env.evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.evolutionApiKey,
        },
        body: JSON.stringify({
          number: this.normalizePhone(number),
          text,
        }),
      },
    )

    const responseBody = await response.text()

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(
          `Falha ao enviar notificação. Verifique se o número está correto e ativo no WhatsApp (${responseBody || response.statusText}).`,
        )
      }

      throw new ServiceUnavailableException(
        `Erro ao enviar notificação via Evolution API: ${responseBody || response.statusText}`,
      )
    }

    return responseBody || null
  }
}
