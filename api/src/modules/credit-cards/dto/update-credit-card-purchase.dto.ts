import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator'

export class UpdateCreditCardPurchaseDto {
  @IsOptional()
  @IsString()
    description?: string

  @IsOptional()
  @IsNumber()
  @IsPositive()
    amount?: number

  @IsOptional()
  @IsDateString()
    purchaseDate?: string

  @IsOptional()
  @IsUUID()
    categoryId?: string | null

  @IsOptional()
  @IsUUID()
    fuelVehicleId?: string | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
    fuelOdometer?: number | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
    fuelLiters?: number | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
    fuelPricePerLiter?: number | null

  @IsOptional()
  @IsUUID()
    maintenanceVehicleId?: string | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
    maintenanceOdometer?: number | null
}
