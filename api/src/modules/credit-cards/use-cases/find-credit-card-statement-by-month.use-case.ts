import { Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'

@Injectable()
export class FindCreditCardStatementByMonthUseCase {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
  ) {}

  async execute(
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
    const status =
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
      status,
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
        fuelFillType: installment.purchase.fuelFillType,
        fuelFirstPumpClick: installment.purchase.fuelFirstPumpClick,
        maintenanceVehicleId: installment.purchase.maintenanceVehicleId,
        maintenanceOdometer: installment.purchase.maintenanceOdometer,
        category: installment.purchase.category,
      })),
    }
  }

  private buildDueDate(year: number, month: number, dueDay: number) {
    const maxDayInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const normalizedDay = Math.min(dueDay, maxDayInMonth)

    return new Date(Date.UTC(year, month, normalizedDay))
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
