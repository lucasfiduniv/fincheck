import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { PayCreditCardStatementDto } from '../dto/pay-credit-card-statement.dto'

@Injectable()
export class PayCreditCardStatementUseCase {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
  ) {}

  async execute(
    userId: string,
    creditCardId: string,
    payCreditCardStatementDto: PayCreditCardStatementDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)
    const { month, year, bankAccountId, amount } = payCreditCardStatementDto

    const accountToUse = bankAccountId ?? card.bankAccountId
    await this.validateBankAccountOwnershipService.validate(userId, accountToUse)

    const pendingInstallments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        statementMonth: month,
        statementYear: year,
        status: 'PENDING',
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    })

    if (pendingInstallments.length === 0) {
      throw new BadRequestException('No pending installments for this statement.')
    }

    const totalPending = pendingInstallments.reduce(
      (acc, installment) => acc + installment.amount,
      0,
    )

    const requestedPaymentAmount = Number((amount ?? totalPending).toFixed(2))

    if (requestedPaymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.')
    }

    const totalToPay = Math.min(requestedPaymentAmount, Number(totalPending.toFixed(2)))

    const { fullyPaidInstallmentIds, partialInstallmentAdjustment, remainingPending } =
      this.allocateStatementPayment(pendingInstallments, totalToPay)

    const paymentDate = new Date()

    const paymentTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: accountToUse,
        categoryId: null,
        name: `Pagamento fatura ${card.name} ${String(month + 1).padStart(2, '0')}/${year}`,
        value: totalToPay,
        date: paymentDate,
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
          paidAt: paymentDate,
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

    return {
      paidInstallments: fullyPaidInstallmentIds.length,
      totalPaid: totalToPay,
      paymentTransactionId: paymentTransaction.id,
      remainingPending,
      partialAppliedToInstallmentId: partialInstallmentAdjustment?.installmentId ?? null,
    }
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
    const totalPendingCents = pendingInstallments.reduce(
      (acc, installment) => acc + Math.round(installment.amount * 100),
      0,
    )

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

    const remainingPending = Number(
      ((totalPendingCents - Math.round(paymentAmount * 100)) / 100).toFixed(2),
    )

    return {
      fullyPaidInstallmentIds,
      partialInstallmentAdjustment,
      remainingPending: Math.max(0, remainingPending),
    }
  }

  private async validateCreditCardOwnership(userId: string, creditCardId: string) {
    const creditCard = await this.creditCardsRepo.findFirst({
      where: {
        id: creditCardId,
        userId,
      },
    })

    if (!creditCard) {
      throw new NotFoundException('Credit card not found.')
    }

    return creditCard
  }
}
