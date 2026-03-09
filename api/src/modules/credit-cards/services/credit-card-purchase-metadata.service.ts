import { BadRequestException, Injectable } from '@nestjs/common'
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repository'
import { VehiclesRepository } from 'src/shared/database/repositories/vehicles.repository'
import { TransactionImportAiEnrichmentService } from '../../ai/services/transaction-import-ai-enrichment.service'

@Injectable()
export class CreditCardPurchaseMetadataService {
  constructor(
    private readonly vehiclesRepo: VehiclesRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly transactionImportAiEnrichmentService: TransactionImportAiEnrichmentService,
  ) {}

  async enrichManualCardExpenseInput({
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

  async validateMaintenanceMetadata(
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

  async validateFuelMetadata(
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
}
