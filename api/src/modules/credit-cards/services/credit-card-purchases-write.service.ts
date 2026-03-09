import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CreditCardInstallmentsRepository } from 'src/shared/database/repositories/credit-card-installments.repository'
import { CreditCardPurchasesRepository } from 'src/shared/database/repositories/credit-card-purchases.repository'
import { TransactionsRepository } from 'src/shared/database/repositories/transactions.repository'
import { ValidateCategoryOwnershipService } from '../../categories/services/validate-category-ownership.service'
import { CreateCreditCardPurchaseDto } from '../dto/create-credit-card-purchase.dto'
import { UpdateCreditCardPurchaseDto } from '../dto/update-credit-card-purchase.dto'
import { CreditCardPurchaseMetadataService } from './credit-card-purchase-metadata.service'
import { CreditCardStatementScheduleService } from './credit-card-statement-schedule.service'

@Injectable()
export class CreditCardPurchasesWriteService {
  constructor(
    private readonly creditCardPurchasesRepo: CreditCardPurchasesRepository,
    private readonly creditCardInstallmentsRepo: CreditCardInstallmentsRepository,
    private readonly transactionsRepo: TransactionsRepository,
    private readonly validateCategoryOwnershipService: ValidateCategoryOwnershipService,
    private readonly creditCardPurchaseMetadataService: CreditCardPurchaseMetadataService,
    private readonly creditCardStatementScheduleService: CreditCardStatementScheduleService,
  ) {}

  async createPurchase(
    userId: string,
    creditCardId: string,
    card: {
      isActive: boolean
      closingDay: number
      dueDay: number
    },
    createCreditCardPurchaseDto: CreateCreditCardPurchaseDto,
  ) {
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

    const aiEnrichment = await this.creditCardPurchaseMetadataService.enrichManualCardExpenseInput({
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

    await this.creditCardPurchaseMetadataService.validateFuelMetadata(
      userId,
      {
        fuelVehicleId,
        fuelOdometer,
        fuelLiters,
        fuelPricePerLiter,
      },
      'cartão',
    )

    await this.creditCardPurchaseMetadataService.validateMaintenanceMetadata(userId, {
      maintenanceVehicleId,
      maintenanceOdometer,
    })

    const normalizedPurchaseDate = this.toUTCDate(purchaseDate)
    const installmentsAmounts = this.creditCardStatementScheduleService.splitInstallments(amount, installmentCount)

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

    const firstStatement = this.creditCardStatementScheduleService.resolveStatementForPurchase(
      normalizedPurchaseDate,
      card.closingDay,
    )

    await this.creditCardInstallmentsRepo.createMany({
      data: installmentsAmounts.map((installmentAmount, index) => {
        const statementRef = this.creditCardStatementScheduleService.addMonthsToStatement(firstStatement, index)

        return {
          userId,
          creditCardId,
          purchaseId: purchase.id,
          installmentNumber: index + 1,
          installmentCount,
          amount: installmentAmount,
          statementMonth: statementRef.month,
          statementYear: statementRef.year,
          dueDate: this.creditCardStatementScheduleService.buildDueDate(statementRef.year, statementRef.month, card.dueDay),
          status: 'PENDING' as const,
        }
      }),
    })

    return purchase
  }

  async updatePurchase(
    userId: string,
    creditCardId: string,
    card: {
      closingDay: number
      dueDay: number
    },
    purchaseId: string,
    updateCreditCardPurchaseDto: UpdateCreditCardPurchaseDto,
  ) {
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

    await this.creditCardPurchaseMetadataService.validateFuelMetadata(
      userId,
      {
        fuelVehicleId: updateCreditCardPurchaseDto.fuelVehicleId,
        fuelOdometer: updateCreditCardPurchaseDto.fuelOdometer,
        fuelLiters: updateCreditCardPurchaseDto.fuelLiters,
        fuelPricePerLiter: updateCreditCardPurchaseDto.fuelPricePerLiter,
      },
      'cartão',
    )

    await this.creditCardPurchaseMetadataService.validateMaintenanceMetadata(userId, {
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

      const nextInstallmentAmounts = this.creditCardStatementScheduleService.splitInstallments(nextAmount, nextInstallmentCount)
      const firstStatement = this.creditCardStatementScheduleService.resolveStatementForPurchase(nextPurchaseDate, card.closingDay)

      await this.creditCardInstallmentsRepo.createMany({
        data: nextInstallmentAmounts.map((installmentAmount, index) => {
          const statementRef = this.creditCardStatementScheduleService.addMonthsToStatement(firstStatement, index)

          return {
            userId,
            creditCardId,
            purchaseId,
            installmentNumber: index + 1,
            installmentCount: nextInstallmentCount,
            amount: installmentAmount,
            statementMonth: statementRef.month,
            statementYear: statementRef.year,
            dueDate: this.creditCardStatementScheduleService.buildDueDate(statementRef.year, statementRef.month, card.dueDay),
            status: 'PENDING' as const,
          }
        }),
      })
    }

    return updatedPurchase
  }

  async cancelPurchase(
    userId: string,
    creditCardId: string,
    card: {
      bankAccountId: string
      name: string
    },
    purchaseId: string,
  ) {
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

  private toUTCDate(date: string) {
    const datePortion = date.split('T')[0]
    const [year, month, day] = datePortion.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, day))
  }
}