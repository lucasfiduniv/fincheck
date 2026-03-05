import { FuelType } from '@prisma/client'
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
    name?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
    model?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
    plate?: string

  @IsOptional()
  @IsEnum(FuelType)
    fuelType?: FuelType

  @IsOptional()
  @IsString()
    photoUrl?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    currentOdometer?: number

  @IsOptional()
  @IsBoolean()
    autoOdometerEnabled?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
    averageDailyKm?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
    odometerBaseValue?: number

  @IsOptional()
  @IsDateString()
    odometerBaseDate?: string

  @IsOptional()
  @IsBoolean()
    confirmOutlier?: boolean
}
