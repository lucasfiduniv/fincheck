import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

export class UpdateCreditCardPurchaseDto {
  @IsOptional()
  @IsIn(['ONE_TIME', 'INSTALLMENT'])
    type?: 'ONE_TIME' | 'INSTALLMENT'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(360)
    installmentCount?: number

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
  @IsIn(['FULL', 'PARTIAL'])
    fuelFillType?: 'FULL' | 'PARTIAL'

  @IsOptional()
  @IsBoolean()
    fuelFirstPumpClick?: boolean | null

  @IsOptional()
  @IsUUID()
    maintenanceVehicleId?: string | null

  @IsOptional()
  @IsNumber()
  @IsPositive()
    maintenanceOdometer?: number | null
}
