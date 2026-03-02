import { Module } from '@nestjs/common'
import { SavingsBoxesController } from './savings-boxes.controller'
import { SavingsBoxesService } from './services/savings-boxes.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [SavingsBoxesController],
  providers: [SavingsBoxesService],
})
export class SavingsBoxesModule {}
