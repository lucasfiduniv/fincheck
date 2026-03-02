import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { SavingsBoxesService } from './services/savings-boxes.service'
import { CreateSavingsBoxDto } from './dto/create-savings-box.dto'
import { UpdateSavingsBoxDto } from './dto/update-savings-box.dto'
import { CreateSavingsBoxEntryDto } from './dto/create-savings-box-entry.dto'
import { SetSavingsBoxGoalDto } from './dto/set-savings-box-goal.dto'
import { SetSavingsBoxRecurrenceDto } from './dto/set-savings-box-recurrence.dto'
import { SetSavingsBoxYieldDto } from './dto/set-savings-box-yield.dto'
import { ShareSavingsBoxDto } from './dto/share-savings-box.dto'

@Controller('savings-boxes')
export class SavingsBoxesController {
  constructor(private readonly savingsBoxesService: SavingsBoxesService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createSavingsBoxDto: CreateSavingsBoxDto,
  ) {
    return this.savingsBoxesService.create(userId, createSavingsBoxDto)
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.savingsBoxesService.findAllByUserId(userId)
  }

  @Get('planning/year')
  getAnnualPlanning(
    @ActiveUserId() userId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.savingsBoxesService.getAnnualPlanning(userId, year)
  }

  @Post('yield/run-month')
  runMonthlyYield(
    @ActiveUserId() userId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.savingsBoxesService.runMonthlyYield(userId, { year, month })
  }

  @Get(':savingsBoxId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.findOneByUserId(userId, savingsBoxId)
  }

  @Patch(':savingsBoxId')
  update(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() updateSavingsBoxDto: UpdateSavingsBoxDto,
  ) {
    return this.savingsBoxesService.update(userId, savingsBoxId, updateSavingsBoxDto)
  }

  @Patch(':savingsBoxId/goal')
  setGoal(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() setSavingsBoxGoalDto: SetSavingsBoxGoalDto,
  ) {
    return this.savingsBoxesService.setGoal(userId, savingsBoxId, setSavingsBoxGoalDto)
  }

  @Get(':savingsBoxId/progress')
  getProgress(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.getProgress(userId, savingsBoxId)
  }

  @Patch(':savingsBoxId/recurrence')
  setRecurrence(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() setSavingsBoxRecurrenceDto: SetSavingsBoxRecurrenceDto,
  ) {
    return this.savingsBoxesService.setRecurrence(
      userId,
      savingsBoxId,
      setSavingsBoxRecurrenceDto,
    )
  }

  @Post(':savingsBoxId/recurrence/run-now')
  runRecurrenceNow(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.runRecurrenceNow(userId, savingsBoxId)
  }

  @Patch(':savingsBoxId/yield')
  setYield(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() setSavingsBoxYieldDto: SetSavingsBoxYieldDto,
  ) {
    return this.savingsBoxesService.setYield(userId, savingsBoxId, setSavingsBoxYieldDto)
  }

  @Get(':savingsBoxId/projection')
  getProjection(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.getProjection(userId, savingsBoxId)
  }

  @Post(':savingsBoxId/deposit')
  deposit(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() createSavingsBoxEntryDto: CreateSavingsBoxEntryDto,
  ) {
    return this.savingsBoxesService.deposit(userId, savingsBoxId, createSavingsBoxEntryDto)
  }

  @Post(':savingsBoxId/withdraw')
  withdraw(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() createSavingsBoxEntryDto: CreateSavingsBoxEntryDto,
  ) {
    return this.savingsBoxesService.withdraw(userId, savingsBoxId, createSavingsBoxEntryDto)
  }

  @Post(':savingsBoxId/share')
  shareWithFriend(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
    @Body() shareSavingsBoxDto: ShareSavingsBoxDto,
  ) {
    return this.savingsBoxesService.shareWithFriend(
      userId,
      savingsBoxId,
      shareSavingsBoxDto.friendUserId,
    )
  }

  @Get(':savingsBoxId/transactions')
  findTransactions(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.findTransactions(userId, savingsBoxId)
  }

  @Get(':savingsBoxId/alerts')
  findAlerts(
    @ActiveUserId() userId: string,
    @Param('savingsBoxId', ParseUUIDPipe) savingsBoxId: string,
  ) {
    return this.savingsBoxesService.findAlerts(userId, savingsBoxId)
  }
}
