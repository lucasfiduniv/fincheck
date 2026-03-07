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
import {
  ImportCreditCardStatementDto,
} from '../dto/import-credit-card-statement.dto'
import { PayCreditCardStatementUseCase } from '../use-cases/pay-credit-card-statement.use-case'
import { FindCreditCardStatementByMonthUseCase } from '../use-cases/find-credit-card-statement-by-month.use-case'
import { ImportCreditCardStatementUseCase } from '../use-cases/import-credit-card-statement.use-case'
import { ExportCreditCardStatementUseCase } from '../use-cases/export-credit-card-statement.use-case'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { RecalibrateCreditCardStatementDto } from '../dto/recalibrate-credit-card-statement.dto'

@Injectable()
export class CreditCardsService {
  constructor(
    private readonly creditCardsRepo: CreditCardsRepository,
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly validateBankAccountOwnershipService: ValidateBankAccountOwnershipService,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
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
      fuelFillType,
      fuelFirstPumpClick,
      maintenanceVehicleId,
      maintenanceOdometer,
    } = createCreditCardPurchaseDto

    const aiEnrichment = await this.enrichManualCardExpenseInput({
      userId,
      description,
      amount,
      currentCategoryId: categoryId,
    })

    const resolvedDescription = aiEnrichment.description
    const resolvedCategoryId = aiEnrichment.categoryId

    if (resolvedCategoryId) {
      await this.validateCategoryOwnershipService.validate(userId, resolvedCategoryId)
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
        categoryId: resolvedCategoryId,
        fuelVehicleId,
        fuelOdometer,
        fuelLiters,
        fuelPricePerLiter,
        fuelFillType: fuelFillType ?? 'PARTIAL',
        fuelFirstPumpClick: !!fuelFirstPumpClick,
        maintenanceVehicleId,
        maintenanceOdometer,
        description: resolvedDescription,
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

  private async enrichManualCardExpenseInput({
    userId,
    description,
    amount,
    currentCategoryId,
  }: {
    userId: string
    description: string
    amount: number
    currentCategoryId?: string
  }) {
    try {
      const availableCategories = await this.categoriesRepo.findMany({
        where: {
          userId,
          type: 'EXPENSE',
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      })

      if (!availableCategories.length) {
        return {
          description,
          categoryId: currentCategoryId,
        }
      }

      const aiSuggestions = await this.transactionImportAiEnrichmentService.enrichEntries({
        entries: [
          {
            index: 0,
            description,
            type: 'EXPENSE',
            amount: Math.abs(amount),
          },
        ],
        categories: availableCategories.map((category) => ({
          id: category.id,
          name: category.name,
          type: 'EXPENSE' as const,
        })),
      })

      const suggestion = aiSuggestions.get(0)
      const normalizedDescription = suggestion?.normalizedDescription?.trim()
        || this.transactionImportAiEnrichmentService.normalizeDescriptionFallback(description)

      if (!suggestion?.categoryId || suggestion.categoryId === currentCategoryId) {
        return {
          description: normalizedDescription,
          categoryId: currentCategoryId,
        }
      }

      const categoriesById = new Map(availableCategories.map((category) => [category.id, category]))
      const currentCategoryName = currentCategoryId
        ? categoriesById.get(currentCategoryId)?.name
        : undefined

      const shouldReplaceCategory = !currentCategoryName || this.isGenericHomeCategory(currentCategoryName)

      return {
        description: normalizedDescription,
        categoryId: shouldReplaceCategory ? suggestion.categoryId : currentCategoryId,
      }
    } catch {
      return {
        description,
        categoryId: currentCategoryId,
      }
    }
  }

  private isGenericHomeCategory(categoryName?: string) {
    if (!categoryName) {
      return false
    }

    const normalized = categoryName
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()

    return normalized.includes('casa')
      || normalized.includes('lar')
      || normalized.includes('moradia')
      || normalized.includes('residenc')
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

    const nextInstallmentCount = updateCreditCardPurchaseDto.installmentCount
      ?? purchase.installmentCount
    const nextType = updateCreditCardPurchaseDto.type
      ?? (nextInstallmentCount > 1 ? 'INSTALLMENT' : 'ONE_TIME')

    if (nextType === 'ONE_TIME' && nextInstallmentCount !== 1) {
      throw new BadRequestException('Compras à vista devem ter exatamente 1 parcela.')
    }

    if (nextType === 'INSTALLMENT' && nextInstallmentCount < 2) {
      throw new BadRequestException('Compras parceladas devem ter no mínimo 2 parcelas.')
    }

    const isAmountBeingUpdated = updateCreditCardPurchaseDto.amount !== undefined
    const isPurchaseDateBeingUpdated = updateCreditCardPurchaseDto.purchaseDate !== undefined
    const isInstallmentCountBeingUpdated = updateCreditCardPurchaseDto.installmentCount !== undefined
    const isTypeBeingUpdated = updateCreditCardPurchaseDto.type !== undefined
    const isInstallmentStructureBeingUpdated =
      isInstallmentCountBeingUpdated
      || isTypeBeingUpdated

    if (hasPaidInstallments && (
      isAmountBeingUpdated
      || isPurchaseDateBeingUpdated
      || isInstallmentStructureBeingUpdated
    )) {
      throw new BadRequestException(
        'Compras com parcelas já pagas só permitem editar descrição, categoria e metadados.',
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
        fuelFillType: updateCreditCardPurchaseDto.fuelFillType,
        fuelFirstPumpClick: updateCreditCardPurchaseDto.fuelFirstPumpClick,
        maintenanceVehicleId: updateCreditCardPurchaseDto.maintenanceVehicleId,
        maintenanceOdometer: updateCreditCardPurchaseDto.maintenanceOdometer,
        purchaseDate: updateCreditCardPurchaseDto.purchaseDate
          ? nextPurchaseDate
          : undefined,
        installmentCount: isInstallmentStructureBeingUpdated
          ? nextInstallmentCount
          : undefined,
        type: isInstallmentStructureBeingUpdated
          ? nextType
          : undefined,
      },
    })

    if (!hasPaidInstallments && (
      isAmountBeingUpdated
      || isPurchaseDateBeingUpdated
      || isInstallmentStructureBeingUpdated
    )) {
      await this.creditCardInstallmentsRepo.deleteMany({
        where: {
          purchaseId,
          userId,
          creditCardId,
        },
      })

      const nextInstallmentAmounts = this.splitInstallments(nextAmount, nextInstallmentCount)
      const firstStatement = this.resolveStatementForPurchase(nextPurchaseDate, card.closingDay)

      await this.creditCardInstallmentsRepo.createMany({
        data: nextInstallmentAmounts.map((installmentAmount, index) => {
          const statementRef = this.addMonthsToStatement(firstStatement, index)

          return {
            userId,
            creditCardId,
            purchaseId,
            installmentNumber: index + 1,
            installmentCount: nextInstallmentCount,
            amount: installmentAmount,
            statementMonth: statementRef.month,
            statementYear: statementRef.year,
            dueDate: this.buildDueDate(statementRef.year, statementRef.month, card.dueDay),
            status: 'PENDING' as const,
          }
        }),
      })
    }

    return updatedPurchase
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
    return this.payCreditCardStatementUseCase.execute(
      userId,
      creditCardId,
      payCreditCardStatementDto,
    )
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
    const includePaid = !!options?.includePaid
    const includeCanceled = !!options?.includeCanceled

    const purchases = await this.creditCardPurchasesRepo.findMany({
      where: {
        userId,
        creditCardId: card.id,
      },
      select: {
        id: true,
        purchaseDate: true,
        installments: {
          orderBy: [{ installmentNumber: 'asc' }],
          select: {
            id: true,
            installmentNumber: true,
            statementMonth: true,
            statementYear: true,
            dueDate: true,
            status: true,
          },
        },
      },
    })

    let updatedInstallments = 0
    let skippedInstallments = 0

    for (const purchase of purchases) {
      const firstStatement = this.resolveStatementForPurchase(
        purchase.purchaseDate,
        card.closingDay,
      )

      for (const installment of purchase.installments) {
        const canRecalculate = installment.status === 'PENDING'
          || (includePaid && installment.status === 'PAID')
          || (includeCanceled && installment.status === 'CANCELED')

        if (!canRecalculate) {
          skippedInstallments += 1
          continue
        }

        const statementRef = this.addMonthsToStatement(
          firstStatement,
          installment.installmentNumber - 1,
        )
        const nextDueDate = this.buildDueDate(statementRef.year, statementRef.month, card.dueDay)

        const statementChanged = installment.statementMonth !== statementRef.month
          || installment.statementYear !== statementRef.year
        const dueDateChanged = installment.dueDate.getTime() !== nextDueDate.getTime()

        if (!statementChanged && !dueDateChanged) {
          skippedInstallments += 1
          continue
        }

        await this.creditCardInstallmentsRepo.update({
          where: {
            id: installment.id,
          },
          data: {
            statementMonth: statementRef.month,
            statementYear: statementRef.year,
            dueDate: nextDueDate,
          },
        })

        updatedInstallments += 1
      }
    }

    return {
      creditCardId: card.id,
      updatedInstallments,
      skippedInstallments,
      includePaid,
      includeCanceled,
    }
  }

}
