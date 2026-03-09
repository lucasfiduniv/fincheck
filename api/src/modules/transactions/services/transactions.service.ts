import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateTransactionDto } from '../dto/create-transaction.dto'
import { CreateTransferDto } from '../dto/create-transfer.dto'
import { UpdateTransactionDto } from '../dto/update-transaction.dto'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { ValidateTransactionOwnershipService } from './validate-transaction-ownership.service'
import { RecurrenceAdjustmentScope } from '../dto/adjust-recurrence-future-values.dto'
import { TransactionStatus, TransactionType } from '../entities/Transaction'
import { ImportBankStatementDto } from '../dto/import-bank-statement.dto'
import { TransactionsGateway } from '../transactions.gateway'
import { TransactionsCreateUseCaseService } from './transactions-create.use-case.service'
import { TransactionsImportUseCaseService } from './transactions-import.use-case.service'
import { TransactionsRecurrenceUseCaseService } from './transactions-recurrence.use-case.service'
import { TransactionsReportsInputUseCaseService } from './transactions-reports-input.use-case.service'

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly validateTransactionOwnershipService: ValidateTransactionOwnershipService,
    private readonly transactionsGateway: TransactionsGateway,
    private readonly transactionsCreateUseCaseService: TransactionsCreateUseCaseService,
    private readonly transactionsImportUseCaseService: TransactionsImportUseCaseService,
    private readonly transactionsRecurrenceUseCaseService: TransactionsRecurrenceUseCaseService,
    private readonly transactionsReportsInputUseCaseService: TransactionsReportsInputUseCaseService,
  ) {}

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto,
    options?: { suppressRealtime?: boolean },
  ) {
    return this.transactionsCreateUseCaseService.create(userId, createTransactionDto, options)
  }

  async createTransfer(userId: string, createTransferDto: CreateTransferDto) {
    return this.transactionsCreateUseCaseService.createTransfer(userId, createTransferDto)
  }

  async importBankStatement(userId: string, importDto: ImportBankStatementDto) {
    return this.transactionsImportUseCaseService.importBankStatement(userId, importDto)
  }

  findAllByUserId(
    userId: string,
    filters: {
      month: number;
      year: number;
      bankAccountId?: string;
      type?: TransactionType;
    },
  ) {
    return this.transactionsReportsInputUseCaseService.findAllByUserId(userId, filters)
  }

  async update(
    userId: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ) {
    const { bankAccountId, categoryId, date, name, type, value } =
      updateTransactionDto

    const currentTransaction = await this.transactionsRepo.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      select: {
        type: true,
      },
    })

    if (!currentTransaction) {
      throw new BadRequestException('Transacao nao encontrada.')
    }

    const isCurrentTransfer = currentTransaction.type === TransactionType.TRANSFER

    if (isCurrentTransfer && type !== TransactionType.TRANSFER) {
      throw new BadRequestException('Nao e permitido converter transferencia para outro tipo nesta rota.')
    }

    if (!isCurrentTransfer && type === TransactionType.TRANSFER) {
      throw new BadRequestException('Use o endpoint de transferencias para criar transferencias entre contas.')
    }

    if (!isCurrentTransfer && !categoryId) {
      throw new BadRequestException('Categoria e obrigatoria para receitas e despesas.')
    }

    await this.validateEntitiesOwnership({
      userId,
      bankAccountId,
      categoryId: isCurrentTransfer ? undefined : categoryId,
      transactionId,
    })

    const updatedTransaction = await this.transactionsRepo.update({
      where: { id: transactionId },
      data: {
        bankAccountId,
        categoryId: isCurrentTransfer ? null : categoryId,
        date,
        name,
        type: isCurrentTransfer ? TransactionType.TRANSFER : type,
        value,
      },
    })

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'UPDATED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
    })

    return updatedTransaction
  }

  async updateStatus(
    userId: string,
    transactionId: string,
    status: TransactionStatus,
  ) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    const updatedTransaction = await this.transactionsRepo.update({
      where: { id: transactionId },
      data: { status },
    })

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'UPDATED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
    })

    return updatedTransaction
  }

  async adjustFutureValuesByRecurrenceGroup(
    userId: string,
    recurrenceGroupId: string,
    data: {
      value: number;
      fromDate?: string;
      scope?: RecurrenceAdjustmentScope;
      transactionId?: string;
    },
  ) {
    return this.transactionsRecurrenceUseCaseService.adjustFutureValuesByRecurrenceGroup(
      userId,
      recurrenceGroupId,
      data,
    )
  }

  async remove(userId: string, transactionId: string) {
    await this.validateEntitiesOwnership({ userId, transactionId })

    await this.transactionsRepo.delete({
      where: { id: transactionId },
    })

    this.transactionsGateway.emitTransactionsChanged(userId, {
      action: 'DELETED',
      source: 'MANUAL',
      count: 1,
      transactionIds: [transactionId],
    })
  }

  async findDueAlertsSummaryByMonth(
    userId: string,
    { month, year }: { month: number; year: number },
  ) {
    return this.transactionsReportsInputUseCaseService.findDueAlertsSummaryByMonth(
      userId,
      { month, year },
    )
  }

  private async validateEntitiesOwnership({
    userId,
    bankAccountId,
    categoryId,
    transactionId,
  }: {
    userId: string;
    bankAccountId?: string;
    categoryId?: string;
    transactionId?: string;
  }) {
    await Promise.all([
      transactionId
        && this.validateTransactionOwnershipService.validate(
          userId,
          transactionId,
        ),
      bankAccountId
        && this.validateBankAccountOwnershipService.validate(
          userId,
          bankAccountId,
        ),
      categoryId
        && this.validateCategoryOwnershipService.validate(userId, categoryId),
    ])
  }
}
