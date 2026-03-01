import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { UsersRepository } from 'src/shared/database/repositories/users.repository'
import { env } from 'src/shared/config/env'
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto'

@Injectable()
export class NotificationsService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async getSettings(userId: string) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
      },
    })

    return {
      phoneNumber: user?.phoneNumber ?? null,
      notificationsEnabled: user?.notificationsEnabled ?? false,
      hasEvolutionConfigured: Boolean(
        env.evolutionApiUrl && env.evolutionApiKey && env.evolutionInstance,
      ),
    }
  }

  async updateSettings(
    userId: string,
    updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ) {
    const normalizedPhone =
      typeof updateNotificationSettingsDto.phoneNumber === 'string'
        ? this.normalizePhone(updateNotificationSettingsDto.phoneNumber)
        : undefined

    if (
      updateNotificationSettingsDto.notificationsEnabled === true
      && !normalizedPhone
    ) {
      throw new BadRequestException('Informe um telefone para habilitar notificações.')
    }

    if (
      updateNotificationSettingsDto.notificationsEnabled === true
      && normalizedPhone
      && !this.isPhoneFormatSupported(normalizedPhone)
    ) {
      throw new BadRequestException('Telefone inválido. Use DDI + DDD + número (ex.: 5542991317112).')
    }

    const user = await this.usersRepo.update({
      where: { id: userId },
      data: {
        phoneNumber: normalizedPhone,
        notificationsEnabled: updateNotificationSettingsDto.notificationsEnabled,
      },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
      },
    })

    return user
  }

  async sendTestNotification(userId: string, customMessage?: string) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phoneNumber: true,
      },
    })

    const number = user?.phoneNumber ?? env.evolutionDefaultPhone

    if (!number) {
      throw new BadRequestException('Cadastre um telefone para enviar notificações de teste.')
    }

    const message =
      customMessage?.trim()
      || `🔔 Fincheck: teste de notificação concluído com sucesso, ${user?.name ?? ''}!`

    await this.sendTextMessage(number, message)
  }

  async notifyUser(userId: string, message: string) {
    const user = await this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        phoneNumber: true,
        notificationsEnabled: true,
      },
    })

    if (!user?.notificationsEnabled || !user.phoneNumber) {
      return
    }

    await this.sendTextMessage(user.phoneNumber, message)
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

    if (!response.ok) {
      const errorBody = await response.text()

      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(
          `Falha ao enviar notificação. Verifique se o número está correto e ativo no WhatsApp (${errorBody || response.statusText}).`,
        )
      }

      throw new ServiceUnavailableException(
        `Erro ao enviar notificação via Evolution API: ${errorBody || response.statusText}`,
      )
    }
  }
}
