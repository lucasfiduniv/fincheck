import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common'
import { TransactionsService } from './services/transactions.service'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { OptionalParseUUIDPipe } from 'src/shared/pipes/OptionalParseUUIDPipe'
import { TransactionType } from './entities/Transaction'
import { OptionalParseEnumPipe } from 'src/shared/pipes/OptionalParseEnumPipe'
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto'
import { AdjustRecurrenceFutureValuesDto } from './dto/adjust-recurrence-future-values.dto'
import { CreateTransferDto } from './dto/create-transfer.dto'
import { ImportBankStatementDto } from './dto/import-bank-statement.dto'

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, createTransactionDto)
  }

  @Post('transfers')
  createTransfer(
    @ActiveUserId() userId: string,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transactionsService.createTransfer(userId, createTransferDto)
  }

  @Post('import-statement')
  importStatement(
    @ActiveUserId() userId: string,
    @Body() importBankStatementDto: ImportBankStatementDto,
  ) {
    return this.transactionsService.importBankStatement(userId, importBankStatementDto)
  }

  @Get()
  findAll(
    @ActiveUserId() userId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('bankAccountId', OptionalParseUUIDPipe) bankAccountId?: string,
    @Query('type', new OptionalParseEnumPipe(TransactionType))
      type?: TransactionType,
  ) {
    return this.transactionsService.findAllByUserId(userId, {
      month,
      year,
      bankAccountId,
      type,
    })
  }

  @Get('due-alerts/summary')
  findDueAlertsSummary(
    @ActiveUserId() userId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.transactionsService.findDueAlertsSummaryByMonth(userId, {
      month,
      year,
    })
  }

  @Put(':transactionId')
  update(
    @ActiveUserId() userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(
      userId,
      transactionId,
      updateTransactionDto,
    )
  }

  @Patch(':transactionId/status')
  updateStatus(
    @ActiveUserId() userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() updateTransactionStatusDto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(
      userId,
      transactionId,
      updateTransactionStatusDto.status,
    )
  }

  @Patch('recurrence-groups/:recurrenceGroupId/future-values')
  adjustFutureValuesByRecurrenceGroup(
    @ActiveUserId() userId: string,
    @Param('recurrenceGroupId', ParseUUIDPipe) recurrenceGroupId: string,
    @Body() adjustRecurrenceFutureValuesDto: AdjustRecurrenceFutureValuesDto,
  ) {
    return this.transactionsService.adjustFutureValuesByRecurrenceGroup(
      userId,
      recurrenceGroupId,
      adjustRecurrenceFutureValuesDto,
    )
  }

  @Delete(':transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.transactionsService.remove(userId, transactionId)
  }
}
