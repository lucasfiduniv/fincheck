import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  IsUUID,
} from 'class-validator'

export class CreateVehiclePartDto {
  @IsUUID()
    bankAccountId: string

  @IsOptional()
  @IsUUID()
    categoryId?: string

  @IsString()
  @IsNotEmpty()
    name: string

  @IsOptional()
  @IsString()
    brand?: string

  @IsOptional()
  @IsNumber()
  @IsPositive()
    quantity?: number

  @IsNumber()
  @IsPositive()
    totalCost: number

  @IsDateString()
    installedAt: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    installedOdometer?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
    lifetimeKm?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
    nextReplacementOdometer?: number

  @IsOptional()
  @IsString()
    notes?: string
}
