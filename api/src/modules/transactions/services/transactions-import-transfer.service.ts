import { Injectable } from '@nestjs/common'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { TransactionsGateway } from '../transactions.gateway'
import { TransactionStatus, TransactionType } from '../entities/Transaction'
import { TransactionsImportDeduplicationService } from './transactions-import-deduplication.service'

@Injectable()
export class TransactionsImportTransferService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly transactionsGateway: TransactionsGateway,
    private readonly transactionsImportDeduplicationService: TransactionsImportDeduplicationService,
  ) {}

  async createImportedTransferTransaction({
    userId,
    bankAccountId,
    date,
    name,
    signedValue,
    counterpartBankAccountId,
    userBankAccounts,
    suppressRealtime,
  }: {
    userId: string;
    bankAccountId: string;
    date: Date;
    name: string;
    signedValue: number;
    counterpartBankAccountId?: string;
    userBankAccounts: Array<{ id: string; name: string }>;
    suppressRealtime?: boolean;
  }) {
    const createdTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId,
        categoryId: null,
        name,
        value: signedValue,
        date,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        entryType: 'SINGLE',
      },
    })

    if (!counterpartBankAccountId || counterpartBankAccountId === bankAccountId) {
      if (!suppressRealtime) {
        this.transactionsGateway.emitTransactionsChanged(userId, {
          action: 'CREATED',
          source: 'MANUAL',
          count: 1,
          transactionIds: [createdTransaction.id],
        })
      }

      return createdTransaction
    }

    const mirroredValue = -signedValue
    const currentAccountName = userBankAccounts.find((account) => account.id === bankAccountId)?.name

    const counterpartDescription = mirroredValue >= 0
      ? `Transferencia recebida de conta propria${currentAccountName ? ` (${currentAccountName})` : ''}`
      : `Transferencia enviada para conta propria${currentAccountName ? ` (${currentAccountName})` : ''}`

    const duplicateCounterpart = await this.transactionsImportDeduplicationService.findPossibleDuplicateTransaction({
      userId,
      bankAccountId: counterpartBankAccountId,
      date,
      value: mirroredValue,
      type: TransactionType.TRANSFER,
      name: counterpartDescription,
      matchByName: false,
    })

    let mirroredTransactionId: string | undefined

    if (!duplicateCounterpart) {
      const mirroredTransaction = await this.transactionsRepo.create({
        data: {
          userId,
          bankAccountId: counterpartBankAccountId,
          categoryId: null,
          name: counterpartDescription,
          value: mirroredValue,
          date,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.POSTED,
          entryType: 'SINGLE',
        },
      })

      mirroredTransactionId = mirroredTransaction.id
    }

    if (!suppressRealtime) {
      this.transactionsGateway.emitTransactionsChanged(userId, {
        action: 'CREATED',
        source: 'MANUAL',
        count: mirroredTransactionId ? 2 : 1,
        transactionIds: mirroredTransactionId
          ? [createdTransaction.id, mirroredTransactionId]
          : [createdTransaction.id],
      })
    }

    return createdTransaction
  }
}