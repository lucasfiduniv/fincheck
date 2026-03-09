import { Injectable } from '@nestjs/common'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ParsedStatementEntry } from './credit-card-statement-parser.service'

@Injectable()
export class CreditCardStatementPaymentImportService {
  constructor(
    private readonly transactionsRepo: TransactionsRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
  ) {}

  async applyImportedPayment({
    userId,
    creditCardId,
    cardName,
    linkedBankAccountId,
    entry,
    amount,
  }: {
    userId: string
    creditCardId: string
    cardName: string
    linkedBankAccountId: string
    entry: ParsedStatementEntry
    amount: number
  }) {
    const dayStart = new Date(Date.UTC(
      entry.date.getUTCFullYear(),
      entry.date.getUTCMonth(),
      entry.date.getUTCDate(),
    ))
    const dayEnd = new Date(Date.UTC(
      entry.date.getUTCFullYear(),
      entry.date.getUTCMonth(),
      entry.date.getUTCDate() + 1,
    ))

    const duplicatePaymentTransaction = await this.transactionsRepo.findFirst({
      where: {
        userId,
        bankAccountId: linkedBankAccountId,
        type: 'EXPENSE',
        value: amount,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
        name: {
          startsWith: `Pagamento fatura ${cardName}`,
        },
      },
      select: {
        id: true,
      },
    })

    if (duplicatePaymentTransaction) {
      return false
    }

    const pendingInstallments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        status: 'PENDING',
      },
      orderBy: [
        { dueDate: 'asc' },
        { statementYear: 'asc' },
        { statementMonth: 'asc' },
        { installmentNumber: 'asc' },
      ],
      select: {
        id: true,
        amount: true,
      },
    })

    if (!pendingInstallments.length) {
      return false
    }

    const totalPending = Number(
      pendingInstallments
        .reduce((acc, installment) => acc + installment.amount, 0)
        .toFixed(2),
    )

    if (totalPending <= 0) {
      return false
    }

    const totalToPay = Math.min(amount, totalPending)
    const { fullyPaidInstallmentIds, partialInstallmentAdjustment } =
      this.allocateStatementPayment(pendingInstallments, totalToPay)

    if (!fullyPaidInstallmentIds.length && !partialInstallmentAdjustment) {
      return false
    }

    const paymentTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: linkedBankAccountId,
        categoryId: null,
        name: `Pagamento fatura ${cardName} ${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}/${entry.date.getUTCFullYear()}`,
        value: totalToPay,
        date: dayStart,
        type: 'EXPENSE',
        status: 'POSTED',
        entryType: 'SINGLE',
      },
    })

    if (fullyPaidInstallmentIds.length > 0) {
      await this.creditCardInstallmentsRepo.updateMany({
        where: {
          id: {
            in: fullyPaidInstallmentIds,
          },
        },
        data: {
          status: 'PAID',
          paidAt: dayStart,
          paymentTransactionId: paymentTransaction.id,
        },
      })
    }

    if (partialInstallmentAdjustment) {
      await this.creditCardInstallmentsRepo.update({
        where: {
          id: partialInstallmentAdjustment.installmentId,
        },
        data: {
          amount: partialInstallmentAdjustment.newAmount,
        },
      })
    }

    return true
  }

  private allocateStatementPayment(
    pendingInstallments: Array<{ id: string; amount: number }>,
    paymentAmount: number,
  ) {
    const fullyPaidInstallmentIds: string[] = []
    let partialInstallmentAdjustment:
      | { installmentId: string; newAmount: number }
      | null = null

    let remainingPaymentAmountCents = Math.round(paymentAmount * 100)

    for (const installment of pendingInstallments) {
      if (remainingPaymentAmountCents <= 0) {
        break
      }

      const installmentAmountCents = Math.round(installment.amount * 100)

      if (remainingPaymentAmountCents >= installmentAmountCents) {
        fullyPaidInstallmentIds.push(installment.id)
        remainingPaymentAmountCents -= installmentAmountCents
      } else {
        const newAmount = Number(
          ((installmentAmountCents - remainingPaymentAmountCents) / 100).toFixed(2),
        )

        partialInstallmentAdjustment = {
          installmentId: installment.id,
          newAmount,
        }
        remainingPaymentAmountCents = 0
      }
    }

    return {
      fullyPaidInstallmentIds,
      partialInstallmentAdjustment,
    }
  }
}