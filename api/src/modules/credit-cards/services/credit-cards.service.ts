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
import { UpdateCreditCardPurchaseDto } from '../dto/update-credit-card-purchase.dto'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'

@Injectable()
export class CreditCardsService {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly vehiclesRepo: VehiclesRepository,
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
      fuelVehicleId,
      fuelOdometer,
      fuelLiters,
      fuelPricePerLiter,
      maintenanceVehicleId,
      maintenanceOdometer,
    } = createCreditCardPurchaseDto

    if (categoryId) {
      await this.validateCategoryOwnershipService.validate(userId, categoryId)
    }

    await this.validateFuelMetadata(
      userId,
      {
        fuelVehicleId,
        fuelOdometer,
        fuelLiters,
        fuelPricePerLiter,
      },
      'cartão',
    )

    await this.validateMaintenanceMetadata(userId, {
      maintenanceVehicleId,
      maintenanceOdometer,
    })

    const normalizedPurchaseDate = this.toUTCDate(purchaseDate)
    const installmentsAmounts = this.splitInstallments(amount, installmentCount)

    const purchase = await this.creditCardPurchasesRepo.create({
      data: {
        userId,
        creditCardId,
        categoryId,
        fuelVehicleId,
        fuelOdometer,
        fuelLiters,
        fuelPricePerLiter,
        maintenanceVehicleId,
        maintenanceOdometer,
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

  async updatePurchase(
    userId: string,
    creditCardId: string,
    purchaseId: string,
    updateCreditCardPurchaseDto: UpdateCreditCardPurchaseDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    const purchase = await this.creditCardPurchasesRepo.findFirst({
      where: {
        id: purchaseId,
        userId,
        creditCardId,
      },
    })

    if (!purchase) {
      throw new NotFoundException('Credit card purchase not found.')
    }

    const installments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        purchaseId,
      },
      orderBy: [{ installmentNumber: 'asc' }],
    })

    if (installments.length === 0) {
      throw new BadRequestException('No installments found for this purchase.')
    }

    const hasCanceledInstallments = installments.some(
      (installment) => installment.status === 'CANCELED',
    )

    if (hasCanceledInstallments) {
      throw new BadRequestException('Canceled purchases cannot be edited.')
    }

    const hasPaidInstallments = installments.some(
      (installment) => installment.status === 'PAID',
    )

    const isAmountBeingUpdated = updateCreditCardPurchaseDto.amount !== undefined
    const isPurchaseDateBeingUpdated = updateCreditCardPurchaseDto.purchaseDate !== undefined

    if (hasPaidInstallments && (isAmountBeingUpdated || isPurchaseDateBeingUpdated)) {
      throw new BadRequestException(
        'Compras com parcelas já pagas só permitem editar descrição e categoria.',
      )
    }

    if (updateCreditCardPurchaseDto.categoryId) {
      await this.validateCategoryOwnershipService.validate(userId, updateCreditCardPurchaseDto.categoryId)
    }

    await this.validateFuelMetadata(
      userId,
      {
        fuelVehicleId: updateCreditCardPurchaseDto.fuelVehicleId,
        fuelOdometer: updateCreditCardPurchaseDto.fuelOdometer,
        fuelLiters: updateCreditCardPurchaseDto.fuelLiters,
        fuelPricePerLiter: updateCreditCardPurchaseDto.fuelPricePerLiter,
      },
      'cartão',
    )

    await this.validateMaintenanceMetadata(userId, {
      maintenanceVehicleId: updateCreditCardPurchaseDto.maintenanceVehicleId,
      maintenanceOdometer: updateCreditCardPurchaseDto.maintenanceOdometer,
    })

    const nextPurchaseDate = updateCreditCardPurchaseDto.purchaseDate
      ? this.toUTCDate(updateCreditCardPurchaseDto.purchaseDate)
      : purchase.purchaseDate
    const nextAmount = updateCreditCardPurchaseDto.amount ?? purchase.amount

    const updatedPurchase = await this.creditCardPurchasesRepo.update({
      where: {
        id: purchase.id,
      },
      data: {
        description: updateCreditCardPurchaseDto.description,
        categoryId: updateCreditCardPurchaseDto.categoryId,
        amount: updateCreditCardPurchaseDto.amount,
        fuelVehicleId: updateCreditCardPurchaseDto.fuelVehicleId,
        fuelOdometer: updateCreditCardPurchaseDto.fuelOdometer,
        fuelLiters: updateCreditCardPurchaseDto.fuelLiters,
        fuelPricePerLiter: updateCreditCardPurchaseDto.fuelPricePerLiter,
        maintenanceVehicleId: updateCreditCardPurchaseDto.maintenanceVehicleId,
        maintenanceOdometer: updateCreditCardPurchaseDto.maintenanceOdometer,
        purchaseDate: updateCreditCardPurchaseDto.purchaseDate
          ? nextPurchaseDate
          : undefined,
      },
    })

    if (!hasPaidInstallments && (isAmountBeingUpdated || isPurchaseDateBeingUpdated)) {
      const nextInstallmentAmounts = this.splitInstallments(nextAmount, purchase.installmentCount)
      const firstStatement = this.resolveStatementForPurchase(nextPurchaseDate, card.closingDay)

      await Promise.all(
        installments.map((installment, index) => {
          const statementRef = this.addMonthsToStatement(firstStatement, index)

          return this.creditCardInstallmentsRepo.update({
            where: { id: installment.id },
            data: {
              amount: nextInstallmentAmounts[index],
              statementMonth: statementRef.month,
              statementYear: statementRef.year,
              dueDate: this.buildDueDate(statementRef.year, statementRef.month, card.dueDay),
            },
          })
        }),
      )
    }

    return updatedPurchase
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

    const nonCanceledInstallments = installments.filter(
      (installment) => installment.status !== 'CANCELED',
    )

    const total = nonCanceledInstallments.reduce((acc, installment) => acc + installment.amount, 0)
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
        purchaseId: installment.purchaseId,
        amount: installment.amount,
        purchaseAmount: installment.purchase.amount,
        status: installment.status,
        installmentNumber: installment.installmentNumber,
        installmentCount: installment.installmentCount,
        description: installment.purchase.description,
        purchaseDate: installment.purchase.purchaseDate,
        fuelVehicleId: installment.purchase.fuelVehicleId,
        fuelOdometer: installment.purchase.fuelOdometer,
        fuelLiters: installment.purchase.fuelLiters,
        fuelPricePerLiter: installment.purchase.fuelPricePerLiter,
        maintenanceVehicleId: installment.purchase.maintenanceVehicleId,
        maintenanceOdometer: installment.purchase.maintenanceOdometer,
        category: installment.purchase.category,
      })),
    }
  }

  private async validateMaintenanceMetadata(
    userId: string,
    metadata: {
      maintenanceVehicleId?: string | null
      maintenanceOdometer?: number | null
    },
  ) {
    const hasAnyMaintenanceMetadata =
      metadata.maintenanceVehicleId != null ||
      metadata.maintenanceOdometer != null

    if (!hasAnyMaintenanceMetadata) {
      return
    }

    if (!metadata.maintenanceVehicleId) {
      throw new BadRequestException('Para manutenção no cartão, informe o veículo.')
    }

    const vehicle = await this.vehiclesRepo.findFirst({
      where: {
        id: metadata.maintenanceVehicleId,
        userId,
      },
      select: {
        id: true,
      },
    })

    if (!vehicle) {
      throw new BadRequestException('Veículo informado não encontrado para este usuário.')
    }
  }

  private async validateFuelMetadata(
    userId: string,
    metadata: {
      fuelVehicleId?: string | null
      fuelOdometer?: number | null
      fuelLiters?: number | null
      fuelPricePerLiter?: number | null
    },
    source: 'cartão' | 'conta',
  ) {
    const hasAnyFuelMetadata =
      metadata.fuelVehicleId != null ||
      metadata.fuelOdometer != null ||
      metadata.fuelLiters != null ||
      metadata.fuelPricePerLiter != null

    if (!hasAnyFuelMetadata) {
      return
    }

    if (
      !metadata.fuelVehicleId ||
      metadata.fuelOdometer == null ||
      metadata.fuelLiters == null ||
      metadata.fuelPricePerLiter == null
    ) {
      throw new BadRequestException(
        `Para abastecimento no ${source}, informe veículo, odômetro, litros e preço por litro.`,
      )
    }

    const vehicle = await this.vehiclesRepo.findFirst({
      where: {
        id: metadata.fuelVehicleId,
        userId,
      },
      select: {
        id: true,
      },
    })

    if (!vehicle) {
      throw new BadRequestException('Veículo informado não encontrado para este usuário.')
    }
  }

  async payStatement(
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

  async cancelPurchase(userId: string, creditCardId: string, purchaseId: string) {
    await this.validateCreditCardOwnership(userId, creditCardId)

    const purchase = await this.creditCardPurchasesRepo.findFirst({
      where: {
        id: purchaseId,
        userId,
        creditCardId,
      },
    })

    if (!purchase) {
      throw new NotFoundException('Credit card purchase not found.')
    }

    const installments = await this.creditCardInstallmentsRepo.findMany({
      where: {
        userId,
        creditCardId,
        purchaseId,
      },
      orderBy: [{ installmentNumber: 'asc' }],
    })

    if (installments.length === 0) {
      throw new BadRequestException('No installments found for this purchase.')
    }

    const paidInstallments = installments.filter((installment) => installment.status === 'PAID')
    const refundableAmount = Number(
      paidInstallments.reduce((acc, installment) => acc + installment.amount, 0).toFixed(2),
    )

    let refundTransactionId: string | null = null

    if (refundableAmount > 0) {
      const card = await this.validateCreditCardOwnership(userId, creditCardId)

      const refundTransaction = await this.transactionsRepo.create({
        data: {
          userId,
          bankAccountId: card.bankAccountId,
          categoryId: null,
          name: `Estorno compra cartão ${card.name}: ${purchase.description}`,
          value: refundableAmount,
          date: new Date(),
          type: 'INCOME',
          status: 'POSTED',
          entryType: 'SINGLE',
        },
      })

      refundTransactionId = refundTransaction.id
    }

    await this.creditCardInstallmentsRepo.updateMany({
      where: {
        id: {
          in: installments.map((installment) => installment.id),
        },
      },
      data: {
        status: 'CANCELED',
      },
    })

    return {
      canceledInstallments: installments.length,
      refundedAmount: refundableAmount,
      refundTransactionId,
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
}
