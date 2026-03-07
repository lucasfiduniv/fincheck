import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateCreditCardPurchaseDto {
  @IsString()
  @IsNotEmpty()
    description: string

  @IsNumber()
  @IsPositive()
    amount: number

  @IsDateString()
    purchaseDate: string

  @IsOptional()
  @IsUUID()
    categoryId?: string

  @IsInt()
  @Min(1)
  @Max(360)
    installmentCount: number

  @IsOptional()
  @IsUUID()
    fuelVehicleId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    fuelOdometer?: number

  @IsOptional()
  @IsNumber()
  @Min(0.01)
    fuelLiters?: number

  @IsOptional()
  @IsNumber()
  @Min(0.01)
    fuelPricePerLiter?: number

  @IsOptional()
  @IsString()
  @IsIn(['FULL', 'PARTIAL'])
    fuelFillType?: 'FULL' | 'PARTIAL'

  @IsOptional()
  @IsBoolean()
    fuelFirstPumpClick?: boolean

  @IsOptional()
  @IsUUID()
    maintenanceVehicleId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    maintenanceOdometer?: number
}
