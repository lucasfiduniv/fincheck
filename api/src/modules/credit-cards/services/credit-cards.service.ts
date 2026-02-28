import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateCreditCardDto } from '../dto/create-credit-card.dto'
import { UpdateCreditCardDto } from '../dto/update-credit-card.dto'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { CreateCreditCardPurchaseDto } from '../dto/create-credit-card-purchase.dto'
import { PayCreditCardStatementDto } from '../dto/pay-credit-card-statement.dto'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'

@Injectable()
export class CreditCardsService {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  async create(userId: string, createCreditCardDto: CreateCreditCardDto) {
    const { bankAccountId, ...rest } = createCreditCardDto

    await this.validateBankAccountOwnershipService.validate(userId, bankAccountId)

    return this.creditCardsRepo.create({
      data: {
        ...rest,
        bankAccountId,
        userId,
      },
    })
  }

  async findAllByUserId(userId: string) {
    const cards = await this.creditCardsRepo.findMany({
      where: { userId },
      include: {
        installments: {
          where: {
            status: 'PENDING',
          },
          select: {
            amount: true,
            statementMonth: true,
            statementYear: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return cards.map(({ installments, ...card }) => {
      const usedLimit = installments.reduce((acc, installment) => acc + installment.amount, 0)
      const availableLimit = Number((card.creditLimit - usedLimit).toFixed(2))
      const currentStatement = this.getCurrentStatementReference()
      const currentStatementTotal = installments
        .filter(
          (installment) =>
            installment.statementMonth === currentStatement.month &&
            installment.statementYear === currentStatement.year,
        )
        .reduce((acc, installment) => acc + installment.amount, 0)

      const nextDue = installments
        .slice()
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]

      return {
        ...card,
        usedLimit: Number(usedLimit.toFixed(2)),
        availableLimit,
        currentStatementTotal: Number(currentStatementTotal.toFixed(2)),
        nextDueDate: nextDue?.dueDate ?? null,
      }
    })
  }

  async update(userId: string, creditCardId: string, updateCreditCardDto: UpdateCreditCardDto) {
    const currentCard = await this.validateCreditCardOwnership(userId, creditCardId)

    if (updateCreditCardDto.bankAccountId) {
      await this.validateBankAccountOwnershipService.validate(
        userId,
        updateCreditCardDto.bankAccountId,
      )
    }

    return this.creditCardsRepo.update({
      where: { id: currentCard.id },
      data: updateCreditCardDto,
    })
  }

  async remove(userId: string, creditCardId: string) {
    await this.validateCreditCardOwnership(userId, creditCardId)

    await this.creditCardsRepo.delete({
      where: { id: creditCardId },
    })

    return null
  }

  async createPurchase(
    userId: string,
    creditCardId: string,
    createCreditCardPurchaseDto: CreateCreditCardPurchaseDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    if (!card.isActive) {
      throw new BadRequestException('Inactive card cannot receive new purchases.')
    }

    const {
      amount,
      categoryId,
      description,
      installmentCount,
      purchaseDate,
    } = createCreditCardPurchaseDto

    if (categoryId) {
      await this.validateCategoryOwnershipService.validate(userId, categoryId)
    }

    const normalizedPurchaseDate = this.toUTCDate(purchaseDate)
    const installmentsAmounts = this.splitInstallments(amount, installmentCount)

    const purchase = await this.creditCardPurchasesRepo.create({
      data: {
        userId,
        creditCardId,
        categoryId,
        description,
        amount,
        purchaseDate: normalizedPurchaseDate,
        type: installmentCount > 1 ? 'INSTALLMENT' : 'ONE_TIME',
        installmentCount,
      },
    })

    const firstStatement = this.resolveStatementForPurchase(
      normalizedPurchaseDate,
      card.closingDay,
    )

    await this.creditCardInstallmentsRepo.createMany({
      data: installmentsAmounts.map((installmentAmount, index) => {
        const statementRef = this.addMonthsToStatement(firstStatement, index)

        return {
          userId,
          creditCardId,
          purchaseId: purchase.id,
          installmentNumber: index + 1,
          installmentCount,
          amount: installmentAmount,
          statementMonth: statementRef.month,
          statementYear: statementRef.year,
          dueDate: this.buildDueDate(statementRef.year, statementRef.month, card.dueDay),
          status: 'PENDING',
        }
      }),
    })

    return purchase
  }

  async findStatementByMonth(
    userId: string,
    creditCardId: string,
    { month, year }: { month: number; year: number },
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    const installments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        statementMonth: month,
        statementYear: year,
      },
      include: {
        purchase: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    })

    const total = installments.reduce((acc, installment) => acc + installment.amount, 0)
    const paid = installments
      .filter((installment) => installment.status === 'PAID')
      .reduce((acc, installment) => acc + installment.amount, 0)
    const pending = Number((total - paid).toFixed(2))
    const dueDate = this.buildDueDate(year, month, card.dueDay)
    const now = new Date()
    const statementStatus =
      pending <= 0
        ? 'PAID'
        : dueDate.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
          ? 'OVERDUE'
          : 'OPEN'

    return {
      card: {
        id: card.id,
        name: card.name,
        dueDay: card.dueDay,
        closingDay: card.closingDay,
      },
      month,
      year,
      dueDate,
      total: Number(total.toFixed(2)),
      paid: Number(paid.toFixed(2)),
      pending,
      status: statementStatus,
      installments: installments.map((installment) => ({
        id: installment.id,
        amount: installment.amount,
        status: installment.status,
        installmentNumber: installment.installmentNumber,
        installmentCount: installment.installmentCount,
        description: installment.purchase.description,
        purchaseDate: installment.purchase.purchaseDate,
        category: installment.purchase.category,
      })),
    }
  }

  async payStatement(
    userId: string,
    creditCardId: string,
    payCreditCardStatementDto: PayCreditCardStatementDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)
    const { month, year, bankAccountId } = payCreditCardStatementDto

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

    const totalToPay = pendingInstallments.reduce(
      (acc, installment) => acc + installment.amount,
      0,
    )

    const paymentDate = new Date()

    const paymentTransaction = await this.transactionsRepo.create({
      data: {
        userId,
        bankAccountId: accountToUse,
        categoryId: null,
        name: `Pagamento fatura ${card.name} ${String(month + 1).padStart(2, '0')}/${year}`,
        value: Number(totalToPay.toFixed(2)),
        date: paymentDate,
        type: 'EXPENSE',
        status: 'POSTED',
        entryType: 'SINGLE',
      },
    })

    await this.creditCardInstallmentsRepo.updateMany({
      where: {
        id: {
          in: pendingInstallments.map((installment) => installment.id),
        },
      },
      data: {
        status: 'PAID',
        paidAt: paymentDate,
        paymentTransactionId: paymentTransaction.id,
      },
    })

    return {
      paidInstallments: pendingInstallments.length,
      totalPaid: Number(totalToPay.toFixed(2)),
      paymentTransactionId: paymentTransaction.id,
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

  private toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }

  private splitInstallments(amount: number, installmentCount: number) {
    const totalCents = Math.round(amount * 100)
    const installmentBaseCents = Math.floor(totalCents / installmentCount)
    const remainder = totalCents - installmentBaseCents * installmentCount

    return Array.from({ length: installmentCount }).map((_, index) => {
      const cents = installmentBaseCents + (index < remainder ? 1 : 0)

      return Number((cents / 100).toFixed(2))
    })
  }

  private resolveStatementForPurchase(date: Date, closingDay: number) {
    const day = date.getUTCDate()

    if (day > closingDay) {
      return this.addMonthsToStatement(
        {
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
        1,
      )
    }

    return {
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    }
  }

  private addMonthsToStatement(
    statement: { month: number; year: number },
    monthsToAdd: number,
  ) {
    const computedDate = new Date(Date.UTC(statement.year, statement.month + monthsToAdd, 1))

    return {
      month: computedDate.getUTCMonth(),
      year: computedDate.getUTCFullYear(),
    }
  }

  private buildDueDate(year: number, month: number, dueDay: number) {
    const maxDayInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const normalizedDay = Math.min(dueDay, maxDayInMonth)

    return new Date(Date.UTC(year, month, normalizedDay))
  }

  private getCurrentStatementReference() {
    const now = new Date()

    return {
      month: now.getUTCMonth(),
      year: now.getUTCFullYear(),
    }
  }
}
