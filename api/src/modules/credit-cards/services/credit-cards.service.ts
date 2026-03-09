import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateCreditCardDto } from '../dto/create-credit-card.dto'
import { UpdateCreditCardDto } from '../dto/update-credit-card.dto'
import { CreditCardsRepository } from 'src/shared/database/repositories/credit-cards.repository'
import { ValidateBankAccountOwnershipService } from '../../bank-accounts/services/validate-bank-account-ownership.service'
import { CreateCreditCardPurchaseDto } from '../dto/create-credit-card-purchase.dto'
import { PayCreditCardStatementDto } from '../dto/pay-credit-card-statement.dto'
import { UpdateCreditCardPurchaseDto } from '../dto/update-credit-card-purchase.dto'
import {
  ImportCreditCardStatementDto,
} from '../dto/import-credit-card-statement.dto'
import { PayCreditCardStatementUseCase } from '../use-cases/pay-credit-card-statement.use-case'
import { FindCreditCardStatementByMonthUseCase } from '../use-cases/find-credit-card-statement-by-month.use-case'
import { ImportCreditCardStatementUseCase } from '../use-cases/import-credit-card-statement.use-case'
import { ExportCreditCardStatementUseCase } from '../use-cases/export-credit-card-statement.use-case'
import { RecalibrateCreditCardStatementDto } from '../dto/recalibrate-credit-card-statement.dto'
import { CreditCardStatementScheduleService } from './credit-card-statement-schedule.service'
import { CreditCardPurchasesWriteService } from './credit-card-purchases-write.service'

@Injectable()
export class CreditCardsService {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly creditCardStatementScheduleService: CreditCardStatementScheduleService,
    private readonly creditCardPurchasesWriteService: CreditCardPurchasesWriteService,
    private readonly payCreditCardStatementUseCase: PayCreditCardStatementUseCase,
    private readonly findCreditCardStatementByMonthUseCase: FindCreditCardStatementByMonthUseCase,
    private readonly importCreditCardStatementUseCase: ImportCreditCardStatementUseCase,
    private readonly exportCreditCardStatementUseCase: ExportCreditCardStatementUseCase,
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
      const currentStatement = this.creditCardStatementScheduleService.getCurrentStatementReference()
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

    const updatedCard = await this.creditCardsRepo.update({
      where: { id: currentCard.id },
      data: updateCreditCardDto,
    })

    if (updateCreditCardDto.closingDay || updateCreditCardDto.dueDay) {
      await this.recalculateInstallmentsSchedule(
        userId,
        updatedCard,
        {
          includePaid: false,
          includeCanceled: false,
        },
      )
    }

    return updatedCard
  }

  async recalibrateStatementSchedule(
    userId: string,
    creditCardId: string,
    recalibrateDto: RecalibrateCreditCardStatementDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    return this.recalculateInstallmentsSchedule(userId, card, recalibrateDto)
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

    return this.creditCardPurchasesWriteService.createPurchase(
      userId,
      creditCardId,
      card,
      createCreditCardPurchaseDto,
    )
  }

  async updatePurchase(
    userId: string,
    creditCardId: string,
    purchaseId: string,
    updateCreditCardPurchaseDto: UpdateCreditCardPurchaseDto,
  ) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    return this.creditCardPurchasesWriteService.updatePurchase(
      userId,
      creditCardId,
      card,
      purchaseId,
      updateCreditCardPurchaseDto,
    )
  }

  async findStatementByMonth(
    userId: string,
    creditCardId: string,
    { month, year }: { month: number; year: number },
  ) {
    return this.findCreditCardStatementByMonthUseCase.execute(userId, creditCardId, {
      month,
      year,
    })
  }

  async importStatement(
    userId: string,
    creditCardId: string,
    importCreditCardStatementDto: ImportCreditCardStatementDto,
  ) {
    return this.importCreditCardStatementUseCase.execute(
      userId,
      creditCardId,
      importCreditCardStatementDto,
    )
  }

  async exportStatement(
    userId: string,
    creditCardId: string,
    { month, year }: { month: number; year: number },
  ) {
    return this.exportCreditCardStatementUseCase.execute(userId, creditCardId, {
      month,
      year,
    })
  }

  async payStatement(
    userId: string,
    creditCardId: string,
    payCreditCardStatementDto: PayCreditCardStatementDto,
  ) {
    return this.payCreditCardStatementUseCase.execute(
      userId,
      creditCardId,
      payCreditCardStatementDto,
    )
  }

  async cancelPurchase(userId: string, creditCardId: string, purchaseId: string) {
    const card = await this.validateCreditCardOwnership(userId, creditCardId)

    return this.creditCardPurchasesWriteService.cancelPurchase(
      userId,
      creditCardId,
      card,
      purchaseId,
    )
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

  private async recalculateInstallmentsSchedule(
    userId: string,
    card: {
      id: string
      closingDay: number
      dueDay: number
    },
    options?: {
      includePaid?: boolean
      includeCanceled?: boolean
    },
  ) {
    return this.creditCardStatementScheduleService.recalculateInstallmentsSchedule(
      userId,
      card,
      options,
    )
  }

}
