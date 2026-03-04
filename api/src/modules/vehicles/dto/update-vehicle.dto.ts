import { FuelType } from '@prisma/client'
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

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
}
