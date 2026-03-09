import { Module } from '@nestjs/common'
import { SavingsBoxesController } from './savings-boxes.controller'
import { SavingsBoxesService } from './services/savings-boxes.service'
import { SavingsBoxesMathService } from './services/savings-boxes-math.service'
import { SavingsBoxesAlertsService } from './services/savings-boxes-alerts.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [SavingsBoxesController],
  providers: [SavingsBoxesService, SavingsBoxesMathService, SavingsBoxesAlertsService],
})
export class SavingsBoxesModule {}
