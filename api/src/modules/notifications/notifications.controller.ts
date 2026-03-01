import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { NotificationsService } from './notifications.service'
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto'
import { SendTestNotificationDto } from './dto/send-test-notification.dto'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('settings')
  getSettings(@ActiveUserId() userId: string) {
    return this.notificationsService.getSettings(userId)
  }

  @Patch('settings')
  updateSettings(
    @ActiveUserId() userId: string,
    @Body() updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(userId, updateNotificationSettingsDto)
  }

  @Post('test')
  async sendTest(
    @ActiveUserId() userId: string,
    @Body() sendTestNotificationDto: SendTestNotificationDto,
  ) {
    await this.notificationsService.sendTestNotification(
      userId,
      sendTestNotificationDto.message,
    )

    return { success: true }
  }
}
